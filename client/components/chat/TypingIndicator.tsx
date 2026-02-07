import { useState, useEffect } from "react";
import { Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface TypingIndicatorProps {
  startTime?: number;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function TypingIndicator({ startTime }: TypingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-muted">
          <Bot className="h-4 w-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      {/* Typing Animation */}
      <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
          />
          <div
            className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
            style={{ animationDelay: "200ms", animationDuration: "1.4s" }}
          />
          <div
            className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
            style={{ animationDelay: "400ms", animationDuration: "1.4s" }}
          />
        </div>
        {elapsed >= 10 && (
          <span className="text-xs text-muted-foreground">
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>
    </div>
  );
}
