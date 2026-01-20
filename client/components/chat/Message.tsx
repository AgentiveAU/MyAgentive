import { useMemo, useState } from "react";
import { User, Bot, Copy, RotateCcw, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn, copyToClipboard } from "@/lib/utils";
import { detectMediaPaths } from "@/lib/media-utils";
import { MediaPreview } from "./MediaPreview";
import { CodeBlock } from "./CodeBlock";
import { MermaidDiagram } from "./MermaidDiagram";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool_use";
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

interface MessageProps {
  message: Message;
  onRetry?: (content: string) => void;
}

export function Message({ message, onRetry }: MessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  // Detect media files in assistant messages
  const mediaFiles = useMemo(() => {
    if (isUser) return [];
    return detectMediaPaths(message.content);
  }, [message.content, isUser]);

  const handleCopy = async () => {
    await copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry(message.content);
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={cn("group flex gap-3 transition-all", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(isUser ? "bg-primary" : "bg-muted")}>
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-muted-foreground" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn("flex flex-col gap-1 max-w-[80%] min-w-0", isUser && "items-end")}>
        {/* Message Bubble */}
        <div className="relative min-w-0">
          <div
            className={cn(
              "rounded-lg px-4 py-2",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:bg-muted-foreground/10 prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-table:my-2 prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-1 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    // Code blocks with copy button or mermaid diagrams
                    pre: ({ children }) => {
                      // Extract language from the code child
                      const codeChild = children as React.ReactElement;
                      const className = codeChild?.props?.className || "";
                      const language = className.replace("language-", "");
                      const content = codeChild?.props?.children;

                      // Render mermaid diagrams
                      if (language === "mermaid" && typeof content === "string") {
                        return <MermaidDiagram chart={content} />;
                      }

                      return (
                        <CodeBlock language={language || undefined}>
                          {content}
                        </CodeBlock>
                      );
                    },
                    // Inline code
                    code: ({ className, children, ...props }) => {
                      // If inside a pre, let the parent handle it
                      const isInPre = className?.includes("language-");
                      if (isInPre) {
                        return <code className={className} {...props}>{children}</code>;
                      }
                      return (
                        <code className="bg-muted text-primary px-1 rounded text-sm font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Hover Actions */}
          <div
            className={cn(
              "absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
              isUser ? "right-full mr-2" : "left-full ml-2"
            )}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {copied ? "Copied!" : "Copy message"}
                </TooltipContent>
              </Tooltip>

              {isUser && onRetry && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleRetry}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Retry message</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        {/* Media Files */}
        {!isUser && mediaFiles.length > 0 && (
          <div className="space-y-2">
            {mediaFiles.map((media, index) => (
              <MediaPreview key={`${media.webUrl}-${index}`} media={media} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground px-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
