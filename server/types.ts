import type { WebSocket } from "ws";

// WebSocket client with session data
export interface WSClient extends WebSocket {
  sessionId?: string;
  sessionName?: string;
  isAlive?: boolean;
  clientId?: string;
}

// Session info returned to clients
export interface SessionInfo {
  id: string;
  name: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  archived?: boolean;
  pinned?: boolean;
}

// Message stored in database
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "tool_use" | "tool_result";
  content: string;
  timestamp: string;
  source?: string;
  metadata?: Record<string, any>;
}

// WebSocket incoming messages
export interface WSChatMessage {
  type: "chat";
  content: string;
  sessionName: string;
}

export interface WSSubscribeMessage {
  type: "subscribe";
  sessionName: string;
}

export interface WSSwitchSessionMessage {
  type: "switch_session";
  sessionName: string;
}

export interface WSPingMessage {
  type: "ping";
}

export type IncomingWSMessage = WSChatMessage | WSSubscribeMessage | WSSwitchSessionMessage | WSPingMessage;

// Outgoing WebSocket messages
export interface WSConnectedMessage {
  type: "connected";
  currentSession?: string;
}

export interface WSHistoryMessage {
  type: "history";
  messages: ChatMessage[];
  sessionName: string;
  isProcessing?: boolean;
  processingStartTime?: number | null;
}

export interface WSUserMessage {
  type: "user_message";
  content: string;
  sessionName: string;
  source: string;
}

export interface WSAssistantMessage {
  type: "assistant_message";
  content: string;
  sessionName: string;
}

export interface WSToolUseMessage {
  type: "tool_use";
  toolName: string;
  toolId: string;
  toolInput: any;
  sessionName: string;
}

export interface WSResultMessage {
  type: "result";
  success: boolean;
  sessionName: string;
  cost?: number;
  duration?: number;
}

export interface WSSessionSwitchedMessage {
  type: "session_switched";
  sessionName: string;
  session: SessionInfo;
}

export interface WSErrorMessage {
  type: "error";
  error: string;
}

export interface WSSessionsListMessage {
  type: "sessions_list";
  sessions: SessionInfo[];
  archivedSessions: SessionInfo[];
}

export interface WSPongMessage {
  type: "pong";
  timestamp: number;
}

export interface WSFileDeliveryMessage {
  type: "file_delivery";
  filePath: string;
  filename: string;
  sessionName: string;
  caption?: string;
  webUrl?: string;
}

export interface WSContextUpdateMessage {
  type: "context_update";
  sessionName: string;
  usedTokens: number;
  maxTokens: number;
  usedPercentage: number;
}

export interface WSCompactingMessage {
  type: "compacting";
  sessionName: string;
}

export interface WSCompactedMessage {
  type: "compacted";
  sessionName: string;
  preTokens?: number;
  trigger?: string;
}

export type OutgoingWSMessage =
  | WSConnectedMessage
  | WSHistoryMessage
  | WSUserMessage
  | WSAssistantMessage
  | WSToolUseMessage
  | WSResultMessage
  | WSSessionSwitchedMessage
  | WSErrorMessage
  | WSSessionsListMessage
  | WSPongMessage
  | WSFileDeliveryMessage
  | WSContextUpdateMessage
  | WSCompactingMessage
  | WSCompactedMessage;

// Activity event for monitoring
export interface ActivityEvent {
  sessionId: string;
  sessionName: string;
  type: "message" | "tool_use" | "tool_result" | "error" | "session_switch";
  summary?: string;
  details?: Record<string, any>;
}

// Subscriber callback type
export type OutputCallback = (message: OutgoingWSMessage) => void;

// Client subscription info
export interface ClientSubscription {
  clientId: string;
  clientType: "web" | "telegram";
  sessionName: string;
  callback: OutputCallback;
}
