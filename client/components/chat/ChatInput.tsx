import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Paperclip, X, File as FileIcon, Image, Film, Music, Mic, Square, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  suggestedPrompt?: string;
  onSuggestedPromptUsed?: () => void;
  sessionName?: string | null;
  droppedFile?: File | null;
  onDroppedFileHandled?: () => void;
}

interface SelectedFile {
  file: File;
  preview?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Type a message...",
  suggestedPrompt,
  onSuggestedPromptUsed,
  sessionName,
  droppedFile,
  onDroppedFileHandled,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  // When a suggested prompt is provided, fill the input
  useEffect(() => {
    if (suggestedPrompt) {
      setInput(suggestedPrompt);
      onSuggestedPromptUsed?.();
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }, 0);
    }
  }, [suggestedPrompt, onSuggestedPromptUsed]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (selectedFile?.preview) {
        URL.revokeObjectURL(selectedFile.preview);
      }
    };
  }, [selectedFile]);

  const handleFileSelect = useCallback((file: File) => {
    // Block file selection while recording or reviewing a voice message
    if (isRecording || audioBlob) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("File too large. Maximum size is 50MB.");
      return;
    }

    // Create preview for images
    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }

    setSelectedFile({ file, preview });
  }, [isRecording, audioBlob]);

  // Handle file dropped from parent (ChatWindow drag overlay)
  useEffect(() => {
    if (droppedFile) {
      handleFileSelect(droppedFile);
      onDroppedFileHandled?.();
    }
  }, [droppedFile, handleFileSelect, onDroppedFileHandled]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const clearSelectedFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
  };

  const uploadFile = async (file: File): Promise<{ storedPath: string; fileType: string; originalFilename: string; webUrl: string } | null> => {
    const formData = new FormData();
    formData.append("file", file);
    if (sessionName) {
      formData.append("sessionName", sessionName);
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || isLoading || isUploading) return;
    if (!input.trim() && !selectedFile) return;

    try {
      let messageContent = input.trim();

      // Upload file if selected
      if (selectedFile) {
        setIsUploading(true);
        const result = await uploadFile(selectedFile.file);
        if (result) {
          // Create attachment tag (parsed by media-utils.ts for display)
          // Use ||| as delimiter to avoid conflicts with [] in filenames
          const attachmentTag = `[[ATTACHMENT|||type:${result.fileType}|||url:${result.webUrl}|||name:${result.originalFilename}]]`;
          // Prepend to user's message
          messageContent = messageContent
            ? `${attachmentTag}\n\n${messageContent}`
            : attachmentTag;
        }
        clearSelectedFile();
      }

      if (messageContent) {
        onSend(messageContent);
      }

      setInput("");
      setIsUploading(false);
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      setIsUploading(false);
      alert(`Failed to upload file: ${(error as Error).message}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (type.startsWith("video/")) return <Film className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <Music className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg",
      });

      audioChunksRef.current = [];
      cancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks regardless of cancel state
        stream.getTracks().forEach((track) => track.stop());

        // Don't set audio state if recording was cancelled
        if (cancelledRef.current) return;

        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    cancelledRef.current = true;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    try {
      setIsUploading(true);

      // Create a File from the Blob
      const extension = audioBlob.type.includes("webm") ? "webm" : "ogg";
      const filename = `voice-${Date.now()}.${extension}`;
      const file = new File([audioBlob], filename, { type: audioBlob.type });

      const result = await uploadFile(file);
      if (result) {
        const attachmentTag = `[[ATTACHMENT|||type:voice|||url:${result.webUrl}|||name:${result.originalFilename}]]`;
        // Add instruction for AI to transcribe the voice message
        const message = `${attachmentTag}\n\n[Voice message recorded - please listen and respond to what I said]`;
        onSend(message);
      }

      // Cleanup
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingDuration(0);
      setIsUploading(false);
    } catch (error) {
      console.error("Failed to send voice message:", error);
      setIsUploading(false);
      alert(`Failed to send voice message: ${(error as Error).message}`);
    }
  };

  // Keep audioUrlRef in sync with audioUrl state
  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const isProcessing = isLoading || isUploading;

  return (
    <div
      className={`border-t p-4 shrink-0 ${isDragOver ? "bg-primary/5 border-primary" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Recording UI */}
      {(isRecording || audioBlob) && (
        <div className="mb-3 p-3 bg-muted rounded-lg flex items-center gap-3">
          {isRecording ? (
            <>
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Recording...</p>
                <p className="text-xs text-muted-foreground">{formatDuration(recordingDuration)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={cancelRecording}
                title="Cancel"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="h-8 w-8 shrink-0 bg-red-500 hover:bg-red-600"
                onClick={stopRecording}
                title="Stop recording"
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          ) : audioBlob && audioUrl ? (
            <>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <audio controls className="w-full h-8" preload="metadata">
                  <source src={audioUrl} />
                </audio>
                <p className="text-xs text-muted-foreground mt-1">{formatDuration(recordingDuration)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={cancelRecording}
                disabled={isUploading}
                title="Discard"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={sendVoiceMessage}
                disabled={isUploading}
                title="Send voice message"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </>
          ) : null}
        </div>
      )}

      {/* File preview */}
      {selectedFile && !isRecording && !audioBlob && (
        <div className={`mb-3 p-3 bg-muted rounded-lg flex items-center gap-3 ${isUploading ? "opacity-75" : ""}`}>
          {selectedFile.preview ? (
            <div className="relative h-12 w-12">
              <img
                src={selectedFile.preview}
                alt="Preview"
                className="h-12 w-12 object-cover rounded"
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-12 w-12 bg-background rounded flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                getFileIcon(selectedFile.file.type)
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {isUploading ? "Uploading..." : formatFileSize(selectedFile.file.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={clearSelectedFile}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
        />

        {/* Attachment button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing || isRecording || !!audioBlob}
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Voice recording button */}
        <Button
          type="button"
          variant={isRecording ? "default" : "outline"}
          size="icon"
          className={`shrink-0 ${isRecording ? "bg-red-500 hover:bg-red-600" : ""}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isProcessing || !!selectedFile || !!audioBlob}
          title={isRecording ? "Stop recording" : "Record voice message"}
        >
          {isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDragOver ? "Drop file here..." : placeholder}
          disabled={disabled || isProcessing}
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && !selectedFile) || disabled || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-2">
        Press {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send
        {" · "}
        <span className="opacity-70">📎 Attach files · 🎤 Voice message</span>
      </p>
    </div>
  );
}
