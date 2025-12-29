import { Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-muted">
          <Bot className="h-4 w-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      {/* Typing Animation */}
      <div className="flex items-center gap-1 bg-muted px-4 py-2 rounded-lg">
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
      </div>
    </div>
  );
}
