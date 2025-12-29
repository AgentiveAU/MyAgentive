import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  suggestedPrompt?: string;
  onSuggestedPromptUsed?: () => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Type a message...",
  suggestedPrompt,
  onSuggestedPromptUsed,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When a suggested prompt is provided, fill the input
  useEffect(() => {
    if (suggestedPrompt) {
      setInput(suggestedPrompt);
      onSuggestedPromptUsed?.();
      // Focus and move cursor to end
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }, 0);
    }
  }, [suggestedPrompt, onSuggestedPromptUsed]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="border-t p-4 shrink-0">
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || disabled || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-2">
        Press {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send
      </p>
    </div>
  );
}
