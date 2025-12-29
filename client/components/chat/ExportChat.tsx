import { useState, useEffect } from "react";
import { Download, FileJson, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool_use";
  content: string;
  timestamp: string;
  toolName?: string;
  toolInput?: Record<string, any>;
}

interface ExportChatProps {
  messages: Message[];
  sessionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportChat({ messages, sessionName, open, onOpenChange }: ExportChatProps) {
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  const exportAsMarkdown = () => {
    const date = new Date().toLocaleDateString();
    let markdown = `# ${sessionName}\n\nExported on ${date}\n\n---\n\n`;

    messages.forEach((msg) => {
      const time = new Date(msg.timestamp).toLocaleString();

      if (msg.role === "tool_use") {
        markdown += `### Tool: ${msg.toolName || "Unknown"}\n`;
        markdown += `\`\`\`json\n${JSON.stringify(msg.toolInput, null, 2)}\n\`\`\`\n\n`;
      } else {
        const role = msg.role === "user" ? "**You**" : "**MyAgentive**";
        markdown += `${role} _(${time})_\n\n${msg.content}\n\n---\n\n`;
      }
    });

    downloadFile(markdown, `${sessionName}-${Date.now()}.md`, "text/markdown");
  };

  const exportAsJson = () => {
    const data = {
      sessionName,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        ...(msg.toolName && { toolName: msg.toolName }),
        ...(msg.toolInput && { toolInput: msg.toolInput }),
      })),
    };

    downloadFile(
      JSON.stringify(data, null, 2),
      `${sessionName}-${Date.now()}.json`,
      "application/json"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Conversation
          </DialogTitle>
          <DialogDescription>
            Download this conversation in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={exportAsMarkdown}
          >
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Markdown</p>
              <p className="text-xs text-muted-foreground">.md file</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={exportAsJson}
          >
            <FileJson className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">JSON</p>
              <p className="text-xs text-muted-foreground">.json file</p>
            </div>
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          {messages.length} messages will be exported
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage export dialog and keyboard shortcut
export function useExportChat() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + E to export
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isExportOpen: isOpen,
    openExport: () => setIsOpen(true),
    closeExport: () => setIsOpen(false),
    setExportOpen: setIsOpen,
  };
}
