import { MessageSquare, Plus, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Session {
  id: string;
  name: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

interface SessionSwitcherProps {
  sessions: Session[];
  currentSessionName: string | null;
  onSwitchSession: (name: string) => void;
  onNewSession: (name?: string) => void;
}

export function SessionSwitcher({
  sessions,
  currentSessionName,
  onSwitchSession,
  onNewSession,
}: SessionSwitcherProps) {
  const currentSession = sessions.find((s) => s.name === currentSessionName);
  const displayName = currentSession?.title || currentSession?.name || "Select session";

  // Get recent sessions (limit to 5)
  const recentSessions = sessions.slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayName}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => onNewSession()}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </DropdownMenuItem>

        {recentSessions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Recent Sessions</DropdownMenuLabel>
            {recentSessions.map((session) => (
              <DropdownMenuItem
                key={session.id}
                onClick={() => onSwitchSession(session.name)}
                className={currentSessionName === session.name ? "bg-accent" : ""}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="truncate">{session.title || session.name}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
