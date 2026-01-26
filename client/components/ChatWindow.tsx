import { useState, useCallback, useRef } from "react";
import { Search, Download, Upload } from "lucide-react";
import { MessageList } from "./chat/MessageList";
import { ChatInput } from "./chat/ChatInput";
import { ChatSearch, useChatSearch } from "./chat/ChatSearch";
import { ExportChat, useExportChat } from "./chat/ExportChat";
import { ConnectionStatus } from "./ConnectionStatus";
import { Button } from "./ui/button";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool_use";
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

interface ChatWindowProps {
  chatId: string | null;
  sessionName: string | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
}

export function ChatWindow({
  chatId,
  sessionName,
  messages,
  isConnected,
  isLoading,
  onSendMessage,
}: ChatWindowProps) {
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | undefined>();
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const { isSearchOpen, openSearch, closeSearch } = useChatSearch();
  const { isExportOpen, openExport, setExportOpen } = useExportChat();
  const messageListRef = useRef<{ scrollToMessage: (id: string) => void }>(null);
  const dragCounterRef = useRef(0);

  const handleSuggest = useCallback((prompt: string) => {
    setSuggestedPrompt(prompt);
  }, []);

  const clearSuggestion = useCallback(() => {
    setSuggestedPrompt(undefined);
  }, []);

  const handleNavigateToMessage = useCallback((messageId: string) => {
    // Find the message element and scroll to it
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight briefly
      element.classList.add("ring-2", "ring-primary");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary");
      }, 2000);
    }
  }, []);

  // Drag and drop handlers for the entire chat window
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setDroppedFile(file);
    }
  }, []);

  const clearDroppedFile = useCallback(() => {
    setDroppedFile(null);
  }, []);

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <h3 className="text-lg font-medium">Welcome to MyAgentive</h3>
          <p className="text-sm text-muted-foreground">
            Select a session or create a new one to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full min-h-0 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-primary/10 border-2 border-dashed border-primary rounded-2xl p-12 text-center">
            <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-xl font-semibold text-primary">Drop file here</p>
            <p className="text-sm text-muted-foreground mt-1">Release to upload</p>
          </div>
        </div>
      )}

      {/* Header - desktop only */}
      <header className="hidden md:flex h-14 items-center px-4 border-b shrink-0">
        <h1 className="text-lg font-semibold">Chat</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={openSearch}
            title="Search in chat (Cmd+K)"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={openExport}
            title="Export chat (Cmd+Shift+E)"
          >
            <Download className="h-4 w-4" />
          </Button>
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </header>

      {/* Search bar */}
      {isSearchOpen && (
        <ChatSearch
          messages={messages}
          onClose={closeSearch}
          onNavigateToMessage={handleNavigateToMessage}
        />
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onRetry={onSendMessage}
        onSuggest={handleSuggest}
      />

      {/* Input */}
      <ChatInput
        onSend={onSendMessage}
        disabled={!isConnected}
        isLoading={isLoading}
        placeholder={isConnected ? "Type a message..." : "Connecting..."}
        suggestedPrompt={suggestedPrompt}
        onSuggestedPromptUsed={clearSuggestion}
        sessionName={sessionName}
        droppedFile={droppedFile}
        onDroppedFileHandled={clearDroppedFile}
      />

      {/* Export Dialog */}
      <ExportChat
        messages={messages}
        sessionName={sessionName || "chat"}
        open={isExportOpen}
        onOpenChange={setExportOpen}
      />
    </div>
  );
}
