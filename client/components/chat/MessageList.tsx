import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, ArrowDown } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { Message } from "./Message";
import { ToolUse } from "./ToolUse";
import { TypingIndicator } from "./TypingIndicator";
import { PromptSuggestions } from "./PromptSuggestions";
import { cn } from "@/lib/utils";

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollButton(false);
    setUserScrolled(false);
  }, []);

  // Use IntersectionObserver for reliable scroll detection on mobile
  useEffect(() => {
    const endElement = messagesEndRef.current;
    if (!endElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show button when the end marker is NOT visible (user scrolled up)
        const isAtBottom = entry.isIntersecting;
        setShowScrollButton(!isAtBottom);
        if (!isAtBottom) {
          setUserScrolled(true);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    observer.observe(endElement);
    return () => observer.disconnect();
  }, [messages.length]); // Re-observe when messages change

  // Auto-scroll on new messages (only if user hasn't scrolled up)
  useEffect(() => {
    if (!userScrolled) {
      scrollToBottom("smooth");
    }
  }, [messages, userScrolled, scrollToBottom]);

  // Always scroll to bottom when loading starts
  useEffect(() => {
    if (isLoading && !userScrolled) {
      scrollToBottom("smooth");
    }
  }, [isLoading, userScrolled, scrollToBottom]);

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
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
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

      {/* Scroll to bottom button - positioned higher on mobile to avoid input overlap */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-20 md:bottom-4 right-4 z-50 h-10 w-10 rounded-full shadow-lg border animate-in fade-in slide-in-from-bottom-2"
          onClick={() => scrollToBottom("smooth")}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
