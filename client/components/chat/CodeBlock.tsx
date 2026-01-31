import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "../ui/button";
import { cn, copyToClipboard } from "@/lib/utils";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

export function CodeBlock({ children, className, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Extract text content from children
  const getCodeText = (): string => {
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === "string") return node;
      if (typeof node === "number") return String(node);
      if (!node) return "";
      if (Array.isArray(node)) return node.map(extractText).join("");
      if (typeof node === "object" && "props" in node) {
        return extractText((node as React.ReactElement).props.children);
      }
      return "";
    };
    return extractText(children);
  };

  const handleCopy = async () => {
    const code = getCodeText();
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code max-w-full">
      {/* Language badge */}
      {language && (
        <div className="absolute top-0 left-3 px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-b">
          {language}
        </div>
      )}

      {/* Copy button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute top-2 right-2 h-7 w-7",
          "opacity-0 group-hover/code:opacity-100 transition-opacity",
          "bg-background/80 hover:bg-background"
        )}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Code content */}
      <pre
        className={cn(
          "overflow-x-auto max-w-full p-3 rounded-md bg-muted-foreground/10 text-foreground text-sm",
          language && "pt-7",
          className
        )}
      >
        {children}
      </pre>
    </div>
  );
}
