import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Message } from "./Message";
import { ToolUse } from "./ToolUse";
import { TypingIndicator } from "./TypingIndicator";
import { PromptSuggestions } from "./PromptSuggestions";

interface MessageData {
  id: string;
  role: "user" | "assistant" | "tool_use";
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

interface MessageListProps {
  messages: MessageData[];
  isLoading?: boolean;
  onRetry?: (content: string) => void;
  onSuggest?: (prompt: string) => void;
}

export function MessageList({ messages, isLoading, onRetry, onSuggest }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-auto">
        <div className="text-center space-y-6 w-full max-w-2xl">
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium">Start a conversation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ask me anything - I have full access to your system
              </p>
            </div>
          </div>

          {/* Prompt Suggestions */}
          {onSuggest && (
            <div className="pt-4">
              <p className="text-xs text-muted-foreground mb-3">Try one of these:</p>
              <PromptSuggestions onSelect={onSuggest} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4 overflow-x-hidden">
          {messages.map((msg) =>
            msg.role === "tool_use" ? (
              <ToolUse key={msg.id} message={msg} />
            ) : (
              <Message key={msg.id} message={msg} onRetry={onRetry} />
            )
          )}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
