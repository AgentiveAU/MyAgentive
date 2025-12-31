import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import type { WSClient, IncomingWSMessage, OutgoingWSMessage } from "./types.js";
import { config } from "./config.js";
import { sessionManager } from "./core/session-manager.js";
import {
  authMiddleware,
  optionalAuthMiddleware,
  createAuthToken,
  deleteToken,
  verifyPassword,
  validateToken,
} from "./auth/middleware.js";
import {
  validateMediaPath,
  getMimeType,
  MAX_MEDIA_SIZE,
} from "./utils/media-detector.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine static files directory
// In compiled binary, use MYAGENTIVE_HOME or cwd; in dev, use relative path
const getStaticDir = () => {
  const myagentiveHome = process.env.MYAGENTIVE_HOME || process.cwd();
  const distPath = path.join(myagentiveHome, "dist");

  // Check if dist exists (production/compiled mode)
  try {
    const fs = require("fs");
    if (fs.existsSync(distPath)) {
      return distPath;
    }
  } catch {}

  // Fallback to client directory (development mode)
  return path.join(__dirname, "../client");
};

const staticDir = getStaticDir();

// Express app
const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static files
app.use("/assets", express.static(path.join(staticDir, "assets")));
app.use("/client", express.static(staticDir));

// Health check (no auth required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth endpoints
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;

  if (!password || !verifyPassword(password)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const token = createAuthToken("web");
  // Only use secure cookies when accessed via HTTPS
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie("session", token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Return token in response for WebSocket auth (httpOnly cookie not accessible via JS)
  res.json({ success: true, token });
});

app.post("/api/auth/logout", (req, res) => {
  const token = req.cookies?.session;
  if (token) {
    deleteToken(token);
  }
  res.clearCookie("session");
  res.json({ success: true });
});

app.get("/api/auth/verify", optionalAuthMiddleware, (req, res) => {
  if (req.userId) {
    res.json({ authenticated: true, authType: req.authType });
  } else {
    res.json({ authenticated: false });
  }
});

// Protected API routes
app.get("/api/sessions", authMiddleware, (req, res) => {
  const archived = req.query.archived === "1" || req.query.archived === "true";
  const sessions = sessionManager.listSessions({ archived });
  res.json(sessions);
});

app.post("/api/sessions", authMiddleware, (req, res) => {
  const { name } = req.body;
  const session = sessionManager.getOrCreateSession(name || undefined, "web");
  const sessions = sessionManager.listSessions();
  const sessionInfo = sessions.find((s) => s.name === (name || session));
  res.status(201).json(sessionInfo);
});

app.get("/api/sessions/:name", authMiddleware, (req, res) => {
  const sessions = sessionManager.listSessions();
  const session = sessions.find((s) => s.name === req.params.name);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

app.delete("/api/sessions/:name", authMiddleware, (req, res) => {
  const deleted = sessionManager.deleteSession(req.params.name);
  if (!deleted) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ success: true });
});

app.patch("/api/sessions/:name", authMiddleware, (req, res) => {
  const { archived, title } = req.body;
  const sessionName = req.params.name;

  // Validate: at least one field must be provided
  if (typeof archived !== "boolean" && typeof title !== "string") {
    return res.status(400).json({
      error: "Invalid request: provide 'archived' (boolean) or 'title' (string)"
    });
  }

  // Handle title rename
  if (typeof title === "string") {
    const renamed = sessionManager.renameSession(sessionName, title);
    if (!renamed) {
      return res.status(404).json({ error: "Session not found" });
    }
  }

  // Handle archive/unarchive
  if (typeof archived === "boolean") {
    let success: boolean;
    if (archived) {
      success = sessionManager.archiveSession(sessionName);
    } else {
      success = sessionManager.unarchiveSession(sessionName);
    }
    if (!success) {
      return res.status(404).json({ error: "Session not found" });
    }
  }

  // Return updated session info (check both active and archived)
  const activeSessions = sessionManager.listSessions({ archived: false });
  const archivedSessions = sessionManager.listSessions({ archived: true });
  const session = [...activeSessions, ...archivedSessions].find((s) => s.name === sessionName);
  res.json(session || { success: true });
});

app.get("/api/sessions/:name/messages", authMiddleware, (req, res) => {
  const messages = sessionManager.getSessionMessages(req.params.name);
  res.json(messages);
});

// Media file serving endpoint (authenticated)
// Security: validates path is within media directory, checks file size
app.get("/api/media/*", authMiddleware, (req, res) => {
  const relativePath = req.params[0];

  // Validate and resolve the path securely
  const fullPath = validateMediaPath(relativePath, config.mediaPath);

  if (!fullPath) {
    return res.status(404).json({ error: "File not found" });
  }

  // Check file size
  const stats = fs.statSync(fullPath);
  if (stats.size > MAX_MEDIA_SIZE) {
    return res.status(413).json({ error: "File too large" });
  }

  // Set appropriate content type
  const mimeType = getMimeType(fullPath);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Length", stats.size);

  // Stream the file
  const stream = fs.createReadStream(fullPath);
  stream.pipe(res);
});

// Legacy API endpoints for compatibility
app.get("/api/chats", authMiddleware, (req, res) => {
  const sessions = sessionManager.listSessions();
  // Transform to old format
  const chats = sessions.map((s) => ({
    id: s.id,
    title: s.title || s.name,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  res.json(chats);
});

app.post("/api/chats", authMiddleware, (req, res) => {
  const { title } = req.body;
  const name = title?.toLowerCase().replace(/[^a-z0-9-]/g, "-") || undefined;
  const session = sessionManager.getOrCreateSession(name, "web");
  const sessions = sessionManager.listSessions();
  const sessionInfo = sessions.find((s) => s.name === name);

  res.status(201).json({
    id: sessionInfo?.id,
    title: sessionInfo?.title || sessionInfo?.name,
    createdAt: sessionInfo?.createdAt,
    updatedAt: sessionInfo?.updatedAt,
  });
});

app.get("/api/chats/:id/messages", authMiddleware, (req, res) => {
  // Try to find session by ID or name
  const sessions = sessionManager.listSessions();
  const session = sessions.find((s) => s.id === req.params.id || s.name === req.params.id);
  if (!session) {
    return res.status(404).json({ error: "Chat not found" });
  }
  const messages = sessionManager.getSessionMessages(session.name);
  // Transform to old format
  const oldMessages = messages.map((m) => ({
    id: m.id,
    chatId: m.sessionId,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
  res.json(oldMessages);
});

app.delete("/api/chats/:id", authMiddleware, (req, res) => {
  const sessions = sessionManager.listSessions();
  const session = sessions.find((s) => s.id === req.params.id || s.name === req.params.id);
  if (!session) {
    return res.status(404).json({ error: "Chat not found" });
  }
  sessionManager.deleteSession(session.name);
  res.json({ success: true });
});

// Serve index.html for SPA routes (must be after API routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

// HTTP server
let server: Server;

// WebSocket server
let wss: WebSocketServer;

// Heartbeat interval
let heartbeatInterval: NodeJS.Timeout;

export async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = createServer(app);
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws: WSClient, req) => {
      // Check auth via query parameter
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const apiKey = url.searchParams.get("api_key");

      let authenticated = false;
      if (token) {
        const { valid } = validateToken(token);
        authenticated = valid;
      } else if (apiKey && apiKey === config.apiKey) {
        authenticated = true;
      }

      if (!authenticated) {
        ws.close(1008, "Unauthorized");
        return;
      }

      console.log("WebSocket client connected");
      ws.isAlive = true;
      ws.clientId = uuidv4();

      ws.send(JSON.stringify({ type: "connected", message: "Connected to MyAgentive" }));

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (data) => {
        try {
          const message: IncomingWSMessage = JSON.parse(data.toString());
          handleWSMessage(ws, message);
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
          ws.send(JSON.stringify({ type: "error", error: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        console.log("WebSocket client disconnected");
        if (ws.clientId) {
          sessionManager.unsubscribeClient(ws.clientId);
        }
      });
    });

    // Heartbeat to detect dead connections
    heartbeatInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        const client = ws as WSClient;
        if (client.isAlive === false) {
          if (client.clientId) {
            sessionManager.unsubscribeClient(client.clientId);
          }
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    server.listen(config.port, () => {
      console.log(`Server running at http://localhost:${config.port}`);
      console.log(`WebSocket endpoint available at ws://localhost:${config.port}/ws`);
      resolve();
    });
  });
}

function handleWSMessage(ws: WSClient, message: IncomingWSMessage): void {
  const clientId = ws.clientId!;

  const sendToClient = (msg: OutgoingWSMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  switch (message.type) {
    case "subscribe": {
      const session = sessionManager.subscribeClient(
        clientId,
        message.sessionName,
        "web",
        sendToClient
      );

      ws.sessionName = message.sessionName;
      console.log(`Client subscribed to session: ${message.sessionName}`);

      // Send existing messages
      const messages = sessionManager.getSessionMessages(message.sessionName);
      sendToClient({
        type: "history",
        messages,
        sessionName: message.sessionName,
      });
      break;
    }

    case "chat": {
      // Ensure subscribed to the session
      const currentSession = sessionManager.getClientSession(clientId);
      if (currentSession !== message.sessionName) {
        sessionManager.subscribeClient(clientId, message.sessionName, "web", sendToClient);
        ws.sessionName = message.sessionName;
      }

      sessionManager.sendMessage(clientId, message.content, "web");
      break;
    }

    case "switch_session": {
      const session = sessionManager.subscribeClient(
        clientId,
        message.sessionName,
        "web",
        sendToClient
      );

      ws.sessionName = message.sessionName;
      const sessions = sessionManager.listSessions();
      const sessionInfo = sessions.find((s) => s.name === message.sessionName);

      sendToClient({
        type: "session_switched",
        sessionName: message.sessionName,
        session: sessionInfo!,
      });

      // Send messages for new session
      const messages = sessionManager.getSessionMessages(message.sessionName);
      sendToClient({
        type: "history",
        messages,
        sessionName: message.sessionName,
      });
      break;
    }

    default:
      console.warn("Unknown message type:", (message as any).type);
  }
}

export async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    clearInterval(heartbeatInterval);

    wss.clients.forEach((ws) => {
      ws.close();
    });

    wss.close(() => {
      server.close(() => {
        console.log("Server stopped");
        resolve();
      });
    });
  });
}
