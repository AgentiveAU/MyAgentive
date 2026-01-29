import { useState } from "react";
import {
  Terminal,
  FileText,
  FileEdit,
  Search,
  FolderSearch,
  Globe,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool_use";
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

interface ToolUseProps {
  message: Message;
}

function getToolIcon(toolName?: string) {
  switch (toolName) {
    case "Bash":
      return <Terminal className="h-3 w-3" />;
    case "Read":
      return <FileText className="h-3 w-3" />;
    case "Write":
    case "Edit":
      return <FileEdit className="h-3 w-3" />;
    case "Grep":
      return <Search className="h-3 w-3" />;
    case "Glob":
      return <FolderSearch className="h-3 w-3" />;
    case "WebSearch":
    case "WebFetch":
      return <Globe className="h-3 w-3" />;
    case "TodoWrite":
      return <CheckSquare className="h-3 w-3" />;
    default:
      return <Terminal className="h-3 w-3" />;
  }
}

function getToolSummary(toolName?: string, toolInput?: Record<string, any>) {
  const input = toolInput || {};

  switch (toolName) {
    case "Read":
      return input.file_path || "";
    case "Write":
    case "Edit":
      return input.file_path || "";
    case "Bash":
      const cmd = input.command || "";
      return cmd.length > 60 ? `${cmd.slice(0, 60)}...` : cmd;
    case "Grep":
      return `"${input.pattern}" in ${input.path || "."}`;
    case "Glob":
      return input.pattern || "";
    case "WebSearch":
      return input.query || "";
    case "WebFetch":
      return input.url || "";
    default:
      const jsonStr = JSON.stringify(input);
      return jsonStr.length > 50 ? `${jsonStr.slice(0, 50)}...` : jsonStr;
  }
}

// Check if a file path is downloadable via the /api/files/ endpoint
function isDownloadable(filePath?: string): boolean {
  if (!filePath) return false;
  // Files in ~/.myagentive/ are downloadable
  return filePath.includes("/.myagentive/") || filePath.startsWith("~/.myagentive/");
}

// Generate the download URL for a file path
function getDownloadUrl(filePath: string): string {
  // Use the /api/files/ endpoint with the path URL-encoded
  return `/api/files/${encodeURIComponent(filePath)}`;
}

export function ToolUse({ message }: ToolUseProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="my-2 border rounded-lg bg-muted/50">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-auto py-2 px-3 hover:bg-muted"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            <Badge variant="outline" className="gap-1.5 font-normal shrink-0">
              {getToolIcon(message.toolName)}
              <span className="font-semibold">{message.toolName}</span>
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {getToolSummary(message.toolName, message.toolInput)}
            </span>
            {message.toolName === "Write" && isDownloadable(message.toolInput?.file_path) && (
              <a
                href={getDownloadUrl(message.toolInput!.file_path)}
                download
                className="ml-2 text-muted-foreground hover:text-foreground shrink-0"
                title="Download file"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-4 w-4" />
              </a>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-3 py-2">
            <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto font-mono">
              {JSON.stringify(message.toolInput, null, 2)}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
