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
  getFileTypeFromMime,
  getExtensionFromMime,
  ensureMediaDirs,
} from "./utils/media-detector.js";
import { getDatabase } from "./db/database.js";
import { transcribeVoiceFile } from "./services/transcription.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine static files directory
// In compiled binary: use MYAGENTIVE_HOME/dist (not embedded dist)
// In development: use repo dist
const getStaticDir = () => {
  // Check if running as compiled Bun binary
  const isCompiledBinary = import.meta.dir.startsWith("/$bunfs");

  if (!isCompiledBinary) {
    // Development mode: check for dist relative to server file
    const repoDistPath = path.join(__dirname, "../dist");
    if (fs.existsSync(repoDistPath)) {
      return repoDistPath;
    }
  }

  // For compiled binary or if no repo dist found:
  // Check MYAGENTIVE_HOME first (installed dist should be here)
  const myagentiveHome = process.env.MYAGENTIVE_HOME || path.join(process.env.HOME || "", ".myagentive");
  const distPath = path.join(myagentiveHome, "dist");
  if (fs.existsSync(distPath)) {
    return distPath;
  }

  // Check Homebrew installation paths (Apple Silicon and Intel Macs)
  const brewPaths = [
    "/opt/homebrew/opt/myagentive/share/myagentive/dist", // Apple Silicon
    "/usr/local/opt/myagentive/share/myagentive/dist", // Intel Mac
  ];
  for (const brewPath of brewPaths) {
    if (fs.existsSync(brewPath)) {
      return brewPath;
    }
  }

  // Fallback to client directory (Vite dev server handles this)
  return path.join(__dirname, "../client");
};

const staticDir = getStaticDir();

// Express app
const app = express();
app.use(cors({ credentials: true, origin: true }));
// Skip JSON parsing for upload endpoint (handled manually for multipart)
app.use((req, res, next) => {
  if (req.path === "/api/upload") {
    return next();
  }
  express.json()(req, res, next);
});
app.use(cookieParser());

// Serve static files
app.use("/assets", express.static(path.join(staticDir, "assets")));
app.use("/client", express.static(staticDir));

// Health check (no auth required)
app.get("/health", async (req, res) => {
  const health: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    ...(config.agentId && { agentId: config.agentId }),
    components: {},
  };

  // Check database connectivity
  try {
    const db = getDatabase();
    db.prepare("SELECT 1").get();
    health.components.database = { status: "ok" };
  } catch (error) {
    health.status = "degraded";
    health.components.database = {
      status: "error",
      error: (error as Error).message
    };
  }

  // Check Telegram bot (only if configured)
  if (config.telegramBotToken) {
    try {
      const { bot } = await import("./telegram/bot.js");
      const me = await bot.api.getMe();
      health.components.telegram = {
        status: "ok",
        botUsername: me.username
      };
    } catch (error) {
      health.status = "degraded";
      health.components.telegram = {
        status: "error",
        error: (error as Error).message
      };
    }
  } else {
    health.components.telegram = { status: "not_configured" };
  }

  // Sessions count
  try {
    const allSessions = sessionManager.listSessions();
    health.components.sessions = {
      status: "ok",
      total: allSessions.length,
    };
  } catch (error) {
    health.components.sessions = {
      status: "error",
      error: (error as Error).message
    };
  }

  // Memory usage
  const mem = process.memoryUsage();
  health.components.memory = {
    status: "ok",
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
  };

  // Set HTTP status based on overall health
  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
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
    res.json({ authenticated: true, authType: req.authType, agentId: config.agentId || undefined });
  } else {
    res.json({ authenticated: false, agentId: config.agentId || undefined });
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
  const { archived, title, pinned } = req.body;
  const sessionName = req.params.name;

  // Validate: at least one field must be provided
  if (typeof archived !== "boolean" && typeof title !== "string" && typeof pinned !== "boolean") {
    return res.status(400).json({
      error: "Invalid request: provide 'archived' (boolean), 'title' (string), or 'pinned' (boolean)"
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

  // Handle pin/unpin
  if (typeof pinned === "boolean") {
    let success: boolean;
    if (pinned) {
      success = sessionManager.pinSession(sessionName);
    } else {
      success = sessionManager.unpinSession(sessionName);
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
// Supports HTTP Range requests for proper audio/video streaming
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

  const mimeType = getMimeType(fullPath);
  const fileSize = stats.size;

  // Handle Range requests for proper streaming
  const range = req.headers.range;

  if (range) {
    // Parse Range header (e.g., "bytes=0-1024")
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range (including NaN from malformed headers)
    if (isNaN(start) || isNaN(end) || start < 0 || start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }

    const chunkSize = end - start + 1;

    res.status(206);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", chunkSize);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Accept-Ranges", "bytes");

    const stream = fs.createReadStream(fullPath, { start, end });
    stream.on("error", (err) => {
      console.error("[Media] Stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to read file" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } else {
    // No Range header - serve entire file
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", fileSize);
    res.setHeader("Accept-Ranges", "bytes");

    const stream = fs.createReadStream(fullPath);
    stream.on("error", (err) => {
      console.error("[Media] Stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to read file" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  }
});

// General file serving endpoint (authenticated)
// Serves files from agent-accessible directories (e.g. ~/.myagentive/)
// Security: validates path is within allowed directories, blocks sensitive files
app.get("/api/files/*", authMiddleware, (req, res) => {
  const requestedPath = req.params[0];

  // Decode and resolve path
  const decodedPath = decodeURIComponent(requestedPath);

  // Handle ~ expansion for home directory
  let expandedPath = decodedPath;
  if (decodedPath.startsWith("~/") || decodedPath === "~") {
    expandedPath = decodedPath.replace(/^~/, process.env.HOME || "");
  }

  const resolvedPath = path.resolve(expandedPath);

  // Security: validate path is within allowed directories
  const myAgentiveHome = process.env.MYAGENTIVE_HOME || path.join(process.env.HOME || "", ".myagentive");
  const allowedPrefixes = [myAgentiveHome];

  const isAllowed = allowedPrefixes.some(prefix =>
    resolvedPath.startsWith(prefix + path.sep) || resolvedPath === prefix
  );

  if (!isAllowed) {
    return res.status(403).json({ error: "Access denied: path outside allowed directories" });
  }

  // Block sensitive files
  const sensitivePatterns = [
    ".env",
    "credentials",
    "id_rsa",
    "id_ed25519",
    ".pem",
    ".key",
    "private",
    "secret",
    "password",
    ".ssh",
  ];
  const lowercasePath = resolvedPath.toLowerCase();
  if (sensitivePatterns.some(pattern => lowercasePath.includes(pattern))) {
    return res.status(403).json({ error: "Access denied: sensitive file" });
  }

  // Check file exists
  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Check it's a file, not a directory
  const stats = fs.statSync(resolvedPath);
  if (stats.isDirectory()) {
    return res.status(400).json({ error: "Cannot serve directories" });
  }

  // Check file size
  if (stats.size > MAX_MEDIA_SIZE) {
    return res.status(413).json({ error: "File too large" });
  }

  const mimeType = getMimeType(resolvedPath);
  const fileSize = stats.size;
  const filename = path.basename(resolvedPath);

  // Set Content-Disposition for download
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // Handle Range requests for proper streaming
  const range = req.headers.range;

  if (range) {
    // Parse Range header (e.g., "bytes=0-1024")
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range (including NaN from malformed headers)
    if (isNaN(start) || isNaN(end) || start < 0 || start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }

    const chunkSize = end - start + 1;

    res.status(206);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", chunkSize);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Accept-Ranges", "bytes");

    const stream = fs.createReadStream(resolvedPath, { start, end });
    stream.on("error", (err) => {
      console.error("[Files] Stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to read file" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } else {
    // No Range header: serve entire file
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", fileSize);
    res.setHeader("Accept-Ranges", "bytes");

    const stream = fs.createReadStream(resolvedPath);
    stream.on("error", (err) => {
      console.error("[Files] Stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to read file" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  }
});

// Send file endpoint (authenticated via API key)
// Explicitly sends a file to all connected clients (web + Telegram)
// Used by the send-file CLI tool
app.post("/api/send-file", (req, res) => {
  // Authenticate via API key header
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== config.apiKey) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const { filePath, filename, caption } = req.body;

  if (!filePath || !filename) {
    return res.status(400).json({ error: "filePath and filename are required" });
  }

  // Verify file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Broadcast to all active sessions
  const broadcastCount = sessionManager.broadcastFileDeliveryToAll(filePath, filename, caption);

  if (broadcastCount === 0) {
    // No active sessions, but file exists - still success
    console.log(`[API] send-file: No active sessions to broadcast to`);
  }

  res.json({
    success: true,
    broadcastCount,
    filePath,
    filename,
  });
});

// File upload endpoint (authenticated)
// Accepts multipart form data with 'file' field and optional 'sessionName'
app.post("/api/upload", authMiddleware, async (req, res) => {
  try {
    // Parse multipart form data using Bun's native Request API
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Expected multipart/form-data" });
    }

    // Collect request body chunks
    const chunks: Uint8Array[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => resolve());
      req.on("error", reject);
    });
    const body = Buffer.concat(chunks);

    // Create a Request object for Bun's FormData parser
    const request = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": contentType },
      body: body,
    });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessionName = formData.get("sessionName") as string | null;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Check file size
    if (file.size > MAX_MEDIA_SIZE) {
      return res.status(413).json({ error: "File too large (max 50MB)" });
    }

    // Ensure media directories exist
    ensureMediaDirs(config.mediaPath);

    // Determine file type and subdirectory
    const mimeType = file.type || "application/octet-stream";
    const { fileType, subDir } = getFileTypeFromMime(mimeType);

    // Generate filename with UUID to prevent collisions
    const originalFilename = file.name || "upload";
    const ext = path.extname(originalFilename) || getExtensionFromMime(mimeType);
    const storedFilename = `${uuidv4()}${ext}`;
    const storedPath = path.join(config.mediaPath, subDir, storedFilename);

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(storedPath, buffer);

    // Transcribe voice files using Deepgram (if available)
    let transcription: string | null = null;
    let transcriptionError: string | null = null;
    if (fileType === "voice") {
      const result = await transcribeVoiceFile(storedPath, mimeType, file.size);
      transcription = result.transcription;
      transcriptionError = result.error;
    }

    // Get session info if sessionName provided
    let sessionId: string | null = null;
    if (sessionName) {
      const sessions = sessionManager.listSessions();
      const session = sessions.find((s) => s.name === sessionName);
      sessionId = session?.id || null;
    }

    // Store in database
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO media_files (id, session_id, file_type, original_filename, stored_path, mime_type, file_size, transcription, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      sessionId,
      fileType,
      originalFilename,
      storedPath,
      mimeType,
      file.size,
      transcription,
      now
    );

    // Return file info
    res.status(201).json({
      id,
      fileType,
      originalFilename,
      storedPath,
      mimeType,
      size: file.size,
      webUrl: `/api/media/${subDir}/${storedFilename}`,
      transcription,
      transcriptionError,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
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

    // Listen for session changes and broadcast to all connected clients
    sessionManager.on("sessions_changed", () => {
      const sessions = sessionManager.listSessions();
      const archivedSessions = sessionManager.listSessions({ archived: true });
      const message = JSON.stringify({
        type: "sessions_list",
        sessions,
        archivedSessions,
      });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });

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

    case "ping": {
      // Application-level ping/pong for Cloudflare Tunnel compatibility
      // Cloudflare has ~60s idle timeout; protocol-level pings may not count as data
      sendToClient({ type: "pong", timestamp: Date.now() });
      break;
    }

    default:
      console.warn("Unknown message type:", (message as any).type);
  }
}

export async function stopServer(): Promise<void> {
  const SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds

  return new Promise((resolve) => {
    let resolved = false;

    const forceResolve = () => {
      if (!resolved) {
        resolved = true;
        console.warn("Server shutdown timed out, forcing termination");
        resolve();
      }
    };

    const gracefulResolve = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.log("Server stopped gracefully");
        resolve();
      }
    };

    // Set timeout for forced shutdown
    const timeoutId = setTimeout(forceResolve, SHUTDOWN_TIMEOUT_MS);

    clearInterval(heartbeatInterval);

    wss.clients.forEach((ws) => {
      ws.close();
    });

    wss.close(() => {
      server.close(() => {
        gracefulResolve();
      });
    });
  });
}
