import { Download, FileText, Play, Music } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import type { DetectedMedia } from "@/lib/media-utils";

interface MediaPreviewProps {
  media: DetectedMedia;
}

// Standardized dimensions for all media types
const MEDIA_WIDTH = "w-80"; // 320px - consistent width for all media
const MEDIA_MAX_WIDTH = "max-w-full"; // Never exceed container

export function MediaPreview({ media }: MediaPreviewProps) {
  switch (media.type) {
    case "audio":
      return (
        <Card className={`${MEDIA_WIDTH} ${MEDIA_MAX_WIDTH}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{media.filename}</p>
                <p className="text-xs text-muted-foreground">Audio</p>
              </div>
            </div>
            <audio controls preload="metadata" className="w-full h-10">
              <source src={media.webUrl} />
              Your browser does not support audio playback.
            </audio>
          </CardContent>
        </Card>
      );

    case "video":
      return (
        <Card className={`${MEDIA_WIDTH} ${MEDIA_MAX_WIDTH} overflow-hidden`}>
          <CardContent className="p-0">
            <video
              controls
              className="w-full aspect-video object-cover"
              preload="metadata"
            >
              <source src={media.webUrl} />
              Your browser does not support video playback.
            </video>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
                {media.filename}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                asChild
              >
                <a href={media.webUrl} download={media.filename}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    case "image":
      return (
        <Card className={`${MEDIA_WIDTH} ${MEDIA_MAX_WIDTH} overflow-hidden`}>
          <CardContent className="p-0">
            <a href={media.webUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={media.webUrl}
                alt={media.filename}
                className="w-full max-h-80 object-contain hover:opacity-90 transition-opacity cursor-pointer"
              />
            </a>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
                {media.filename}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                asChild
              >
                <a href={media.webUrl} download={media.filename}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    case "document":
    default:
      return (
        <Card className={`${MEDIA_WIDTH} ${MEDIA_MAX_WIDTH}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{media.filename}</p>
                <p className="text-xs text-muted-foreground">Document</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                asChild
              >
                <a href={media.webUrl} download={media.filename}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
  }
}
