import { useState, useMemo } from "react";
import {
  MessageSquare,
  Archive,
  Plus,
  Search,
  PanelLeftClose,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { SessionItem } from "./SessionItem";
import { SessionListSkeleton } from "./SessionListSkeleton";

interface Session {
  id: string;
  name: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  pinned?: boolean;
}

interface SidebarProps {
  sessions: Session[];
  archivedSessions: Session[];
  currentSessionName: string | null;
  sessionsLoading?: boolean;
  onSwitchSession: (name: string) => void;
  onNewSession: (name?: string) => void;
  onRenameSession: (name: string, newTitle: string) => void;
  onArchiveSession: (name: string) => void;
  onUnarchiveSession: (name: string) => void;
  onPinSession: (name: string, pinned: boolean) => void;
  onDeleteSession: (name: string) => void;
  agentId?: string | null;
  // Desktop collapse control
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  sessions,
  archivedSessions,
  currentSessionName,
  sessionsLoading = false,
  onSwitchSession,
  onNewSession,
  onRenameSession,
  onArchiveSession,
  onUnarchiveSession,
  onPinSession,
  onDeleteSession,
  agentId,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      const slug = newSessionName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      onNewSession(slug);
      setNewSessionName("");
    } else {
      onNewSession();
    }
    setShowNewInput(false);
  };

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (session) =>
        session.name.toLowerCase().includes(query) ||
        session.title?.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  const filteredArchivedSessions = useMemo(() => {
    if (!searchQuery.trim()) return archivedSessions;
    const query = searchQuery.toLowerCase();
    return archivedSessions.filter(
      (session) =>
        session.name.toLowerCase().includes(query) ||
        session.title?.toLowerCase().includes(query)
    );
  }, [archivedSessions, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header with New Session button */}
      <div className="p-3 border-b flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Collapse button - desktop only */}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 hidden md:flex"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
          <span
            className="text-sm font-semibold truncate"
            title={agentId ? `MyAgentive · ${agentId}` : undefined}
          >
            MyAgentive{agentId ? ` · ${agentId}` : ""}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowNewInput(true)}
          className="h-8 w-8 shrink-0"
          title="New Session"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* New Session Input - shown when creating */}
      {showNewInput && (
        <div className="p-3 border-b shrink-0">
          <div className="flex gap-2">
            <Input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="Session name (optional)"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSession();
                if (e.key === "Escape") {
                  setShowNewInput(false);
                  setNewSessionName("");
                }
              }}
              autoFocus
              className="flex-1"
            />
            <Button onClick={handleCreateSession} size="sm">
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Tabs - takes all remaining space */}
      <Tabs defaultValue="active" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 px-2 pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Active
              {sessions.length > 0 && (
                <span className="text-[10px] opacity-70">({sessions.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-1.5 text-xs">
              <Archive className="h-3.5 w-3.5" />
              Archived
              {archivedSessions.length > 0 && (
                <span className="text-[10px] opacity-70">({archivedSessions.length})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search input */}
        <div className="px-3 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Active Sessions Tab */}
        <TabsContent value="active" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            {sessionsLoading ? (
              <SessionListSkeleton />
            ) : (
              <div className="p-2 space-y-1">
                {filteredSessions.length === 0 ? (
                  <div className="py-8 px-4 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery
                        ? "No sessions match your search"
                        : "No active sessions"}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowNewInput(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create your first session
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={currentSessionName === session.name}
                      onClick={() => onSwitchSession(session.name)}
                      onRename={onRenameSession}
                      onArchive={onArchiveSession}
                      onPin={onPinSession}
                      onDelete={onDeleteSession}
                    />
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Archived Sessions Tab */}
        <TabsContent value="archived" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            {sessionsLoading ? (
              <SessionListSkeleton />
            ) : (
              <div className="p-2 space-y-1">
                {filteredArchivedSessions.length === 0 ? (
                  <div className="py-8 px-4 text-center text-muted-foreground">
                    <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery
                        ? "No archived sessions match your search"
                        : "No archived sessions"}
                    </p>
                  </div>
                ) : (
                  filteredArchivedSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isArchived={true}
                      onClick={() => onSwitchSession(session.name)}
                      onUnarchive={onUnarchiveSession}
                      onDelete={onDeleteSession}
                    />
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Minimal Footer */}
      <div className="p-2 border-t shrink-0">
        <p className="text-[10px] text-muted-foreground text-center opacity-70">
          <a
            href="https://MyAgentive.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
          >
            MyAgentive.ai
          </a>
          <span className="mx-1">·</span>
          <span>v{__APP_VERSION__}</span>
        </p>
      </div>
    </div>
  );
}
