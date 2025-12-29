import { ReactNode, useState, useEffect } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Sheet, SheetContent } from "./ui/sheet";
import { Button } from "./ui/button";
import { Sidebar } from "./Sidebar";
import { SessionSwitcher } from "./SessionSwitcher";
import { ConnectionStatus } from "./ConnectionStatus";
import { HamburgerMenu } from "./HamburgerMenu";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  name: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

interface AppShellProps {
  children: ReactNode;
  sessions: Session[];
  archivedSessions: Session[];
  currentSessionName: string | null;
  isConnected: boolean;
  sessionsLoading?: boolean;
  onSwitchSession: (name: string) => void;
  onNewSession: (name?: string) => void;
  onRenameSession: (name: string, newTitle: string) => void;
  onArchiveSession: (name: string) => void;
  onUnarchiveSession: (name: string) => void;
  onDeleteSession: (name: string) => void;
  onLogout: () => void;
}

export function AppShell({
  children,
  sessions,
  archivedSessions,
  currentSessionName,
  isConnected,
  sessionsLoading = false,
  onSwitchSession,
  onNewSession,
  onRenameSession,
  onArchiveSession,
  onUnarchiveSession,
  onDeleteSession,
  onLogout,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sheet
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop collapse

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Alt + N: New session
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNewSession();
      }

      // Ctrl/Cmd + B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        // On mobile, toggle the sheet; on desktop, toggle collapse
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setSidebarOpen((prev) => !prev);
        } else {
          setSidebarCollapsed((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewSession]);

  const sidebarProps = {
    sessions,
    archivedSessions,
    currentSessionName,
    sessionsLoading,
    onSwitchSession: (name: string) => {
      onSwitchSession(name);
      setSidebarOpen(false); // Close sidebar on session switch (mobile)
    },
    onNewSession: (name?: string) => {
      onNewSession(name);
      setSidebarOpen(false); // Close sidebar on new session (mobile)
    },
    onRenameSession,
    onArchiveSession,
    onUnarchiveSession,
    onDeleteSession,
    onLogout,
    // Pass collapse control to sidebar
    isCollapsed: sidebarCollapsed,
    onToggleCollapse: () => setSidebarCollapsed(!sidebarCollapsed),
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar - hidden on mobile */}
      <aside
        className={cn(
          "hidden md:flex border-r shrink-0 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-0" : "w-72"
        )}
      >
        <div className={cn(
          "w-72 h-full transition-transform duration-300 ease-in-out",
          sidebarCollapsed ? "-translate-x-full" : "translate-x-0"
        )}>
          <Sidebar {...sidebarProps} />
        </div>
      </aside>

      {/* Collapsed sidebar rail - desktop only */}
      {sidebarCollapsed && (
        <div className="hidden md:flex flex-col items-center py-3 px-2 border-r shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(false)}
            className="h-10 w-10"
            title="Expand sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger - visible only on mobile */}
        <header className="md:hidden flex items-center h-14 px-2 border-b shrink-0 gap-1">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <HamburgerMenu
              isOpen={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            />
            <SheetContent
              side="left"
              className="w-[280px] p-0"
              hideCloseButton
            >
              <Sidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>

          {/* Session switcher for mobile */}
          <div className="flex-1 min-w-0">
            <SessionSwitcher
              sessions={sessions}
              currentSessionName={currentSessionName}
              onSwitchSession={onSwitchSession}
              onNewSession={onNewSession}
            />
          </div>

          {/* Connection status */}
          <ConnectionStatus isConnected={isConnected} />
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
