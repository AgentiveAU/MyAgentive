import { useState } from "react";
import {
  MessageSquare,
  Archive,
  MoreHorizontal,
  Pencil,
  ArchiveX,
  Trash2,
  ArchiveRestore,
  Pin,
  PinOff,
} from "lucide-react";

// Simple relative time formatter
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  name: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  pinned?: boolean;
}

interface SessionItemProps {
  session: Session;
  isActive?: boolean;
  isArchived?: boolean;
  onClick: () => void;
  onRename?: (name: string, newTitle: string) => void;
  onArchive?: (name: string) => void;
  onUnarchive?: (name: string) => void;
  onPin?: (name: string, pinned: boolean) => void;
  onDelete?: (name: string) => void;
}

export function SessionItem({
  session,
  isActive = false,
  isArchived = false,
  onClick,
  onRename,
  onArchive,
  onUnarchive,
  onPin,
  onDelete,
}: SessionItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(session.title || session.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const relativeTime = formatRelativeTime(session.updatedAt);

  const handleRename = () => {
    if (newTitle.trim() && onRename) {
      onRename(session.name, newTitle.trim());
      setIsRenaming(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(session.name);
      setShowDeleteDialog(false);
    }
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setIsRenaming(false);
              setNewTitle(session.title || session.name);
            }
          }}
          onBlur={handleRename}
          autoFocus
          className="flex-1 h-8"
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
          isActive ? "bg-accent" : "hover:bg-accent/50"
        )}
        onClick={onClick}
      >
        {isArchived ? (
          <Archive className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : session.pinned ? (
          <Pin className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <span className="truncate text-sm">
            {session.title || session.name}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {relativeTime}
          </span>
        </div>

        {/* Actions dropdown - visible on hover or when dropdown is open */}
        <div className="opacity-0 group-hover:opacity-100 shrink-0">
          {isArchived ? (
            // Archived session actions
            <div className="flex items-center gap-1">
              {onUnarchive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnarchive(session.name);
                  }}
                  title="Restore"
                >
                  <ArchiveRestore className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  title="Delete permanently"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            // Active session actions
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRename && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRenaming(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                )}
                {onPin && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin(session.name, !session.pinned);
                    }}
                  >
                    {session.pinned ? (
                      <>
                        <PinOff className="h-4 w-4 mr-2" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 mr-2" />
                        Pin
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(session.name);
                    }}
                  >
                    <ArchiveX className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{session.title || session.name}" and
              all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
