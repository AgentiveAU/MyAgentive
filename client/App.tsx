import { useState, useEffect, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { ChatWindow } from "./components/ChatWindow";
import { LoginForm } from "./components/LoginForm";
import { AppShell } from "./components/AppShell";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { useAuth } from "./hooks/useAuth";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

interface Session {
  id: string;
  name: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "tool_use";
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

// Use relative URLs - Vite will proxy to the backend
const API_BASE = "/api";

// Polyfill for crypto.randomUUID - not available in non-secure contexts (HTTP over IP)
// In some browsers, crypto.randomUUID exists but throws when called in non-secure contexts
function generateUUID(): string {
  // Try native implementation first (only works in secure contexts)
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Falls through to fallback
  }
  // Fallback using crypto.getRandomValues (available in all contexts)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getWSUrl(token: string | null): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  // Use same host - Vite proxy handles WebSocket forwarding in dev mode
  return `${protocol}//${host}/ws${token ? `?token=${token}` : ""}`;
}

export default function App() {
  const { isAuthenticated, isLoading: authLoading, checkAuth, logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<Session[]>([]);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    // Load token from localStorage on initial mount
    return localStorage.getItem("sessionToken");
  });

  // Handle login with token
  const handleLogin = useCallback((token: string) => {
    localStorage.setItem("sessionToken", token);
    setSessionToken(token);
    checkAuth();
  }, [checkAuth]);

  // Clear token on logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("sessionToken");
    setSessionToken(null);
    logout();
  }, [logout]);

  // Handle WebSocket messages
  const handleWSMessage = useCallback((message: any) => {
    switch (message.type) {
      case "connected":
        console.log("Connected to server");
        break;

      case "history":
        setMessages(
          (message.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }))
        );
        break;

      case "user_message":
        // Only add messages from other sources (e.g., Telegram)
        // Local web messages are already added optimistically
        if (message.source && message.source !== "web") {
          setMessages((prev) => [
            ...prev,
            {
              id: generateUUID(),
              role: "user",
              content: `[${message.source === "telegram" ? "Telegram" : message.source}] ${message.content}`,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsLoading(true);
        }
        break;

      case "assistant_message":
        setMessages((prev) => [
          ...prev,
          {
            id: generateUUID(),
            role: "assistant",
            content: message.content,
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsLoading(false);
        break;

      case "tool_use":
        setMessages((prev) => [
          ...prev,
          {
            id: message.toolId,
            role: "tool_use",
            content: "",
            timestamp: new Date().toISOString(),
            toolName: message.toolName,
            toolInput: message.toolInput,
          },
        ]);
        break;

      case "result":
        setIsLoading(false);
        fetchSessions();
        break;

      case "session_switched":
        setCurrentSessionName(message.sessionName);
        break;

      case "error":
        console.error("Server error:", message.error);
        setIsLoading(false);
        toast.error(message.error || "An error occurred");
        break;
    }
  }, []);

  const wsUrl = sessionToken ? getWSUrl(sessionToken) : null;

  const { sendJsonMessage, readyState, lastJsonMessage } = useWebSocket(
    wsUrl,
    {
      shouldReconnect: (closeEvent) => {
        // Don't reconnect if closed due to authentication failure
        if (closeEvent.code === 1008) {
          console.log('[WS] Authentication failed, clearing session');
          localStorage.removeItem("sessionToken");
          setSessionToken(null);
          logout();
          toast.error("Session expired. Please log in again.");
          return false;
        }
        return true;
      },
      reconnectAttempts: 10,
      reconnectInterval: 3000,
      onOpen: () => console.log('[WS] Connection opened'),
      onClose: (event) => console.log('[WS] Connection closed', { code: event.code, reason: event.reason }),
      onError: (event) => console.error('[WS] Error:', event),
    },
    !!sessionToken
  );

  const isConnected = readyState === ReadyState.OPEN;

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastJsonMessage) {
      handleWSMessage(lastJsonMessage);
    }
  }, [lastJsonMessage, handleWSMessage]);

  // Fetch all sessions (active and archived)
  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const [activeRes, archivedRes] = await Promise.all([
        fetch(`${API_BASE}/sessions`, { credentials: "include" }),
        fetch(`${API_BASE}/sessions?archived=1`, { credentials: "include" }),
      ]);
      if (activeRes.ok) {
        setSessions(await activeRes.json());
      }
      if (archivedRes.ok) {
        setArchivedSessions(await archivedRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Create new session
  const createSession = async (name?: string) => {
    try {
      // Generate a unique name if not provided
      const sessionName = name || `session-${Date.now()}`;
      const res = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: sessionName }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }

      const session = await res.json();
      await fetchSessions();
      switchSession(session.name);
      toast.success("Session created");
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error("Failed to create session");
    }
  };

  // Delete session
  const deleteSession = async (name: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${name}`, {
        method: "DELETE",
        credentials: "include",
      });
      await fetchSessions();
      if (currentSessionName === name) {
        setCurrentSessionName(null);
        setMessages([]);
      }
      toast.success("Session deleted");
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete session");
    }
  };

  // Archive session
  const archiveSession = async (name: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: true }),
      });
      await fetchSessions();
      // If we archived the current session, switch to the next active one
      if (currentSessionName === name) {
        const remainingActive = sessions.filter((s) => s.name !== name);
        if (remainingActive.length > 0) {
          switchSession(remainingActive[0].name);
        } else {
          setCurrentSessionName(null);
          setMessages([]);
        }
      }
      toast.success("Session archived");
    } catch (error) {
      console.error("Failed to archive session:", error);
      toast.error("Failed to archive session");
    }
  };

  // Unarchive session
  const unarchiveSession = async (name: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: false }),
      });
      await fetchSessions();
      toast.success("Session restored");
    } catch (error) {
      console.error("Failed to unarchive session:", error);
      toast.error("Failed to restore session");
    }
  };

  // Rename session
  const renameSession = async (name: string, newTitle: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle }),
      });
      await fetchSessions();
      toast.success("Session renamed");
    } catch (error) {
      console.error("Failed to rename session:", error);
      toast.error("Failed to rename session");
    }
  };

  // Switch to a session
  const switchSession = (name: string) => {
    setCurrentSessionName(name);
    setMessages([]);
    setIsLoading(false);

    if (isConnected) {
      sendJsonMessage({ type: "subscribe", sessionName: name });
    }
  };

  // Send a message
  const handleSendMessage = (content: string) => {
    if (!currentSessionName || !isConnected) return;

    // Add message optimistically
    setMessages((prev) => [
      ...prev,
      {
        id: generateUUID(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      },
    ]);

    setIsLoading(true);

    sendJsonMessage({
      type: "chat",
      content,
      sessionName: currentSessionName,
    });
  };

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  // Auto-select first session or create default
  useEffect(() => {
    if (isAuthenticated && sessions.length > 0 && !currentSessionName) {
      switchSession(sessions[0].name);
    } else if (isAuthenticated && sessions.length === 0 && !sessionsLoading && isConnected) {
      // Only create default session after fetchSessions completes (sessionsLoading = false)
      // and confirms there are truly no sessions
      createSession("default");
    }
  }, [isAuthenticated, sessions, currentSessionName, isConnected, sessionsLoading]);

  // Application-level ping for Cloudflare Tunnel compatibility
  // Cloudflare has ~60s idle timeout; protocol-level pings may not count as data
  useEffect(() => {
    if (readyState !== ReadyState.OPEN) return;

    const pingInterval = setInterval(() => {
      sendJsonMessage({ type: "ping" });
    }, 25000); // 25 seconds - safe margin under 60s timeout

    return () => clearInterval(pingInterval);
  }, [readyState, sendJsonMessage]);

  // Connection status notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const hasPreviouslyConnected = sessionStorage.getItem("ws_connected");

    if (readyState === ReadyState.OPEN) {
      if (hasPreviouslyConnected) {
        toast.success("Reconnected to server", { duration: 2000 });
      }
      sessionStorage.setItem("ws_connected", "true");
      toast.dismiss("connecting");
    } else if (readyState === ReadyState.CLOSED && hasPreviouslyConnected) {
      toast.error("Connection lost. Reconnecting...", { duration: 3000 });
    } else if (readyState === ReadyState.CONNECTING && hasPreviouslyConnected) {
      toast.loading("Reconnecting...", { id: "connecting", duration: Infinity });
    }
  }, [readyState, isAuthenticated]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const selectedChatId = sessions.find((s) => s.name === currentSessionName)?.id || null;

  return (
    <>
      <AppShell
        sessions={sessions}
        archivedSessions={archivedSessions}
        currentSessionName={currentSessionName}
        isConnected={isConnected}
        sessionsLoading={sessionsLoading}
        onSwitchSession={switchSession}
        onNewSession={createSession}
        onRenameSession={renameSession}
        onArchiveSession={archiveSession}
        onUnarchiveSession={unarchiveSession}
        onDeleteSession={deleteSession}
        onLogout={handleLogout}
      >
        <ChatWindow
          chatId={selectedChatId}
          sessionName={currentSessionName}
          messages={messages}
          isConnected={isConnected}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </AppShell>
      <Toaster position="bottom-right" />
      <KeyboardShortcuts />
    </>
  );
}
