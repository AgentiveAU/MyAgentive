import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { AgentSession } from "./ai-client.js";
import { sessionRepo } from "../db/repositories/session-repo.js";
import { messageRepo } from "../db/repositories/message-repo.js";
import { messageSessionTracker } from "../telegram/message-session-tracker.js";
import type {
  SessionInfo,
  ChatMessage,
  OutputCallback,
  ClientSubscription,
  OutgoingWSMessage,
  ActivityEvent,
} from "../types.js";

// Recursively get all files in a directory
function scanDirectory(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

// Options for listing sessions
export interface ListSessionsOptions {
  archived?: boolean;
}

// Convert database session to SessionInfo
function toSessionInfo(dbSession: any): SessionInfo {
  return {
    id: dbSession.id,
    name: dbSession.name,
    title: dbSession.title,
    createdAt: dbSession.created_at,
    updatedAt: dbSession.updated_at,
    archived: dbSession.archived === 1,
    pinned: dbSession.pinned === 1,
  };
}

// Convert database message to ChatMessage
function toChatMessage(dbMessage: any): ChatMessage {
  return {
    id: dbMessage.id,
    sessionId: dbMessage.session_id,
    role: dbMessage.role,
    content: dbMessage.content,
    timestamp: dbMessage.timestamp,
    source: dbMessage.source,
    metadata: dbMessage.metadata ? JSON.parse(dbMessage.metadata) : undefined,
  };
}

class ManagedSession {
  public readonly sessionId: string;
  public readonly sessionName: string;
  private agentSession: AgentSession;
  private subscribers: Map<string, ClientSubscription> = new Map();
  private isListening = false;
  private isResetting = false;
  private isProcessing = false;
  private eventEmitter: EventEmitter;
  private mediaSnapshotBeforeMessage: Set<string> = new Set();
  private sdkSessionId: string | null = null;

  constructor(sessionId: string, sessionName: string, eventEmitter: EventEmitter, sdkSessionId?: string | null) {
    this.sessionId = sessionId;
    this.sessionName = sessionName;
    this.eventEmitter = eventEmitter;
    this.sdkSessionId = sdkSessionId || null;

    // Create agent session, attempting to resume if we have an SDK session ID
    if (this.sdkSessionId) {
      console.log(`[Session ${sessionName}] Creating session with resume ID: ${this.sdkSessionId}`);
    }
    this.agentSession = new AgentSession({
      resumeSessionId: this.sdkSessionId || undefined,
    });
  }

  // Get the media directory path
  private getMediaPath(): string {
    return path.join(process.env.HOME || "", ".myagentive", "media");
  }

  // Take snapshot of current files in media/
  private snapshotMediaDirectory(): void {
    const mediaPath = this.getMediaPath();
    const files = scanDirectory(mediaPath);
    this.mediaSnapshotBeforeMessage = new Set(files);
  }

  // Find new files since snapshot
  private findNewMediaFiles(): string[] {
    const mediaPath = this.getMediaPath();
    const currentFiles = scanDirectory(mediaPath);
    return currentFiles.filter(f => !this.mediaSnapshotBeforeMessage.has(f));
  }

  private async startListening() {
    if (this.isListening) return;
    this.isListening = true;

    try {
      for await (const message of this.agentSession.getOutputStream()) {
        this.handleSDKMessage(message);
      }
    } catch (error) {
      console.error(`Error in session ${this.sessionName}:`, error);
      this.broadcastError((error as Error).message);

      // Emit activity event for the error
      this.emitActivity("error", `Session error: ${(error as Error).message}`);

      // Clear the stale SDK session ID and reset so next message uses a fresh session (fixes issue #78)
      this.sdkSessionId = null;
      sessionRepo.clearSdkSessionId(this.sessionId);
      await this.resetAgentSession();
    } finally {
      // Reset listening state so session can recover
      this.isListening = false;
      // Clear processing state to prevent session getting stuck if SDK crashes
      // before sending a result message (fixes issue #78)
      this.isProcessing = false;
    }
  }

  // Reset the agent session (for recovery after errors)
  private async resetAgentSession(): Promise<void> {
    // Prevent concurrent resets
    if (this.isResetting) {
      console.log(`[Session ${this.sessionName}] Reset already in progress, skipping`);
      return;
    }

    this.isResetting = true;

    try {
      // Close old session
      try {
        this.agentSession.close();
      } catch {
        // Ignore close errors
      }

      // Small delay to allow process cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new session, attempting to resume with stored SDK session ID
      if (this.sdkSessionId) {
        console.log(`[Session ${this.sessionName}] Resetting with resume ID: ${this.sdkSessionId}`);
      }
      this.agentSession = new AgentSession({
        resumeSessionId: this.sdkSessionId || undefined,
      });
      this.isListening = false;
      console.log(`[Session ${this.sessionName}] Agent session reset complete`);
    } finally {
      this.isResetting = false;
    }
  }

  async sendMessage(content: string, source: string = "web"): Promise<void> {
    // Prevent concurrent message processing
    if (this.isProcessing) {
      console.log(`[Session ${this.sessionName}] Already processing a message, please wait`);
      this.broadcastError("Please wait for the current request to complete");
      return;
    }

    this.isProcessing = true;

    try {
      // Take snapshot of media directory before processing
      this.snapshotMediaDirectory();

      // Store user message in database
      messageRepo.create({
        session_id: this.sessionId,
        role: "user",
        content,
        source,
      });

      // Broadcast user message to all subscribers
      this.broadcast({
        type: "user_message",
        content,
        sessionName: this.sessionName,
        source,
      });

      // Emit activity event
      this.emitActivity("message", `User: ${content.substring(0, 100)}...`, { role: "user", source });

      // Try to send to agent, reset session if it fails
      try {
        this.agentSession.sendMessage(content);
      } catch (error) {
        console.warn(`[Session ${this.sessionName}] Agent session error, resetting: ${(error as Error).message}`);
        await this.resetAgentSession();
        // Try again with fresh session
        try {
          this.agentSession.sendMessage(content);
        } catch (retryError) {
          console.error(`[Session ${this.sessionName}] Failed to send message after reset:`, retryError);
          this.broadcastError(`Failed to send message: ${(retryError as Error).message}`);
          return;
        }
      }

      // Start listening if not already
      if (!this.isListening) {
        this.startListening();
      }
    } finally {
      // Note: isProcessing stays true until the agent completes (result event)
      // This is intentional to prevent sending multiple messages while agent is working
    }
  }

  // Called when agent completes processing (from handleSDKMessage on result)
  private markProcessingComplete(): void {
    this.isProcessing = false;
  }

  private handleSDKMessage(message: any) {
    // Capture SDK session ID from init messages for session resume
    if (message.type === "system" && message.subtype === "init" && message.session_id) {
      const newSdkSessionId = message.session_id;
      if (this.sdkSessionId !== newSdkSessionId) {
        console.log(`[Session ${this.sessionName}] Captured SDK session ID: ${newSdkSessionId}`);
        this.sdkSessionId = newSdkSessionId;
        // Store in database for persistence across restarts
        sessionRepo.updateSdkSessionId(this.sessionId, newSdkSessionId);
      }
    }

    // Broadcast context usage updates from SDK messages
    // The SDK may include context info in various message types
    this.broadcastContextIfAvailable(message);

    // Handle compaction status messages from SDK
    if (message.type === "system" && message.subtype === "status" && message.status === "compacting") {
      console.log(`[Session ${this.sessionName}] Context compaction started`);
      this.broadcast({
        type: "compacting",
        sessionName: this.sessionName,
      });
    }

    // Handle compaction completion (compact_boundary marks where compaction occurred)
    if (message.type === "system" && message.subtype === "compact_boundary") {
      console.log(`[Session ${this.sessionName}] Context compaction completed`);
      this.broadcast({
        type: "compacted",
        sessionName: this.sessionName,
        preTokens: message.compact_metadata?.pre_tokens,
        trigger: message.compact_metadata?.trigger,
      });
    }

    if (message.type === "assistant") {
      const content = message.message.content;

      if (typeof content === "string") {
        this.storeAndBroadcastAssistant(content);
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text") {
            this.storeAndBroadcastAssistant(block.text);
          } else if (block.type === "tool_use") {
            this.broadcast({
              type: "tool_use",
              toolName: block.name,
              toolId: block.id,
              toolInput: block.input,
              sessionName: this.sessionName,
            });

            // Emit activity event for tool use
            this.emitActivity("tool_use", `Tool: ${block.name}`, {
              toolName: block.name,
              toolId: block.id,
              toolInput: block.input,
            });
          }
        }
      }
    } else if (message.type === "result") {
      this.broadcast({
        type: "result",
        success: message.subtype === "success",
        sessionName: this.sessionName,
        cost: message.total_cost_usd,
        duration: message.duration_ms,
      });

      // Check for new files in media directory (outbox model)
      if (message.subtype === "success") {
        const newFiles = this.findNewMediaFiles();
        for (const filePath of newFiles) {
          this.broadcast({
            type: "file_delivery",
            filePath,
            filename: path.basename(filePath),
            sessionName: this.sessionName,
          });
          console.log(`[Session] Delivering file from outbox: ${filePath}`);
        }
      }

      // Mark processing complete so new messages can be sent
      this.markProcessingComplete();
    }
  }

  // Extract and broadcast context usage information from SDK messages
  private broadcastContextIfAvailable(message: any): void {
    // Only process result messages which contain complete usage info
    if (message.type !== "result" || !message.usage) {
      return;
    }

    const usage = message.usage;
    // Calculate total context usage: new input + cached content being read + new content being cached
    const usedTokens =
      (usage.input_tokens || 0) +
      (usage.cache_read_input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0);

    if (usedTokens > 0) {
      // Default max tokens for Claude models (200k context window)
      const maxTokens = 200000;
      const usedPercentage = Math.round((usedTokens / maxTokens) * 100);
      this.broadcast({
        type: "context_update",
        sessionName: this.sessionName,
        usedTokens,
        maxTokens,
        usedPercentage,
      });
    }
  }

  private storeAndBroadcastAssistant(content: string) {
    // Store in database
    messageRepo.create({
      session_id: this.sessionId,
      role: "assistant",
      content,
      source: "agent",
    });

    // Broadcast to subscribers
    this.broadcast({
      type: "assistant_message",
      content,
      sessionName: this.sessionName,
    });
  }

  subscribe(clientId: string, clientType: "web" | "telegram", callback: OutputCallback) {
    this.subscribers.set(clientId, {
      clientId,
      clientType,
      sessionName: this.sessionName,
      callback,
    });
  }

  unsubscribe(clientId: string) {
    this.subscribers.delete(clientId);
  }

  hasSubscribers(): boolean {
    return this.subscribers.size > 0;
  }

  private broadcast(message: OutgoingWSMessage) {
    for (const subscription of this.subscribers.values()) {
      try {
        subscription.callback(message);
      } catch (error) {
        console.error(`Error broadcasting to client ${subscription.clientId}:`, error);
        this.subscribers.delete(subscription.clientId);
      }
    }
  }

  private broadcastError(error: string) {
    this.broadcast({
      type: "error",
      error,
    });
  }

  private emitActivity(type: ActivityEvent["type"], summary: string, details?: Record<string, any>) {
    this.eventEmitter.emit("activity", {
      sessionId: this.sessionId,
      sessionName: this.sessionName,
      type,
      summary,
      details,
    } as ActivityEvent);
  }

  close() {
    this.agentSession.close();
  }
}

class SessionManager extends EventEmitter {
  private sessions: Map<string, ManagedSession> = new Map();
  private clientSessions: Map<string, string> = new Map(); // clientId -> sessionName

  // Broadcast session list changes to all connected clients
  private broadcastSessionsUpdate(): void {
    this.emit("sessions_changed");
  }

  getOrCreateSession(name: string, createdBy: string = "web"): ManagedSession {
    // Check if session already exists in memory
    let session = this.sessions.get(name);
    if (session) {
      return session;
    }

    // Get or create in database
    const dbSession = sessionRepo.getOrCreateByName(name, createdBy);

    // Create managed session with SDK session ID for resume capability
    session = new ManagedSession(dbSession.id, dbSession.name, this, dbSession.sdk_session_id);
    this.sessions.set(name, session);

    // Broadcast session list update for new sessions
    this.broadcastSessionsUpdate();

    return session;
  }

  getSession(name: string): ManagedSession | null {
    return this.sessions.get(name) || null;
  }

  listSessions(options: ListSessionsOptions = {}): SessionInfo[] {
    const dbSessions = sessionRepo.list({ archived: options.archived });
    return dbSessions.map(toSessionInfo);
  }

  archiveSession(name: string): boolean {
    // Close managed session if in memory
    const session = this.sessions.get(name);
    if (session) {
      session.close();
      this.sessions.delete(name);
    }
    const result = sessionRepo.archiveByName(name);
    if (result) {
      this.broadcastSessionsUpdate();
    }
    return result;
  }

  unarchiveSession(name: string): boolean {
    const result = sessionRepo.unarchiveByName(name);
    if (result) {
      this.broadcastSessionsUpdate();
    }
    return result;
  }

  pinSession(name: string): boolean {
    const result = sessionRepo.pinByName(name);
    if (result) {
      this.broadcastSessionsUpdate();
    }
    return result;
  }

  unpinSession(name: string): boolean {
    const result = sessionRepo.unpinByName(name);
    if (result) {
      this.broadcastSessionsUpdate();
    }
    return result;
  }

  getSessionMessages(sessionName: string): ChatMessage[] {
    const dbMessages = messageRepo.getBySessionName(sessionName);
    return dbMessages.map(toChatMessage);
  }

  subscribeClient(
    clientId: string,
    sessionName: string,
    clientType: "web" | "telegram",
    callback: OutputCallback
  ): ManagedSession {
    // Unsubscribe from previous session if any
    this.unsubscribeClient(clientId);

    // Get or create session
    const session = this.getOrCreateSession(sessionName, clientType);

    // Subscribe to session
    session.subscribe(clientId, clientType, callback);

    // Track client's current session
    this.clientSessions.set(clientId, sessionName);

    return session;
  }

  unsubscribeClient(clientId: string) {
    const currentSessionName = this.clientSessions.get(clientId);
    if (currentSessionName) {
      const session = this.sessions.get(currentSessionName);
      if (session) {
        session.unsubscribe(clientId);
      }
      this.clientSessions.delete(clientId);
    }
  }

  sendMessage(clientId: string, content: string, source: string = "web") {
    const sessionName = this.clientSessions.get(clientId);
    if (!sessionName) {
      throw new Error(`Client ${clientId} is not subscribed to any session`);
    }

    const session = this.sessions.get(sessionName);
    if (!session) {
      throw new Error(`Session ${sessionName} not found`);
    }

    session.sendMessage(content, source);
  }

  getClientSession(clientId: string): string | null {
    return this.clientSessions.get(clientId) || null;
  }

  renameSession(name: string, newTitle: string): boolean {
    const dbSession = sessionRepo.getByName(name);
    if (!dbSession) {
      return false;
    }
    sessionRepo.updateTitle(dbSession.id, newTitle);
    this.broadcastSessionsUpdate();
    return true;
  }

  deleteSession(name: string): boolean {
    const session = this.sessions.get(name);
    if (session) {
      session.close();
      this.sessions.delete(name);
    }

    // Clear Telegram message session mappings for this session
    messageSessionTracker.clearSessionMappings(name);

    const result = sessionRepo.deleteByName(name);
    if (result) {
      this.broadcastSessionsUpdate();
    }
    return result;
  }

  // Clean up inactive sessions (no subscribers)
  cleanup() {
    for (const [name, session] of this.sessions) {
      if (!session.hasSubscribers()) {
        session.close();
        this.sessions.delete(name);
      }
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
