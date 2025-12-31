import { Linkedin, Mail, FileText, Image, Mic, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  prompt: string;
}

const suggestions: Suggestion[] = [
  {
    icon: <Linkedin className="h-4 w-4" />,
    title: "Post to LinkedIn",
    prompt: "Help me write and post a LinkedIn update about ",
  },
  {
    icon: <Mail className="h-4 w-4" />,
    title: "Send email",
    prompt: "Compose and send an email to ",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    title: "Create document",
    prompt: "Create a Word document with ",
  },
  {
    icon: <Presentation className="h-4 w-4" />,
    title: "Make presentation",
    prompt: "Create a PowerPoint presentation about ",
  },
  {
    icon: <Image className="h-4 w-4" />,
    title: "Generate image",
    prompt: "Generate an image of ",
  },
  {
    icon: <Mic className="h-4 w-4" />,
    title: "Transcribe audio",
    prompt: "Transcribe the audio file at ",
  },
];

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
}

export function PromptSuggestions({ onSelect }: PromptSuggestionsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl mx-auto">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion.prompt)}
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg text-left",
            "bg-muted/50 hover:bg-muted transition-colors",
            "border border-transparent hover:border-border",
            "group"
          )}
        >
          <div className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
            {suggestion.icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{suggestion.title}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {suggestion.prompt}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
