import { Download, FileText } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import type { DetectedMedia } from "@/lib/media-utils";

interface MediaPreviewProps {
  media: DetectedMedia;
}

export function MediaPreview({ media }: MediaPreviewProps) {
  switch (media.type) {
    case "audio":
      return (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">
                {media.filename}
              </span>
            </div>
            <audio controls className="w-full">
              <source src={media.webUrl} />
              Your browser does not support audio playback.
            </audio>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-2"
              asChild
            >
              <a href={media.webUrl} download={media.filename}>
                <Download className="h-3 w-3 mr-1" />
                Download
              </a>
            </Button>
          </CardContent>
        </Card>
      );

    case "video":
      return (
        <Card>
          <CardContent className="p-0">
            <video controls className="w-full max-w-lg rounded-lg">
              <source src={media.webUrl} />
              Your browser does not support video playback.
            </video>
            <div className="p-3">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                asChild
              >
                <a href={media.webUrl} download={media.filename}>
                  <Download className="h-3 w-3 mr-1" />
                  Download {media.filename}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    case "image":
      return (
        <Card>
          <CardContent className="p-0">
            <img
              src={media.webUrl}
              alt={media.filename}
              className="max-w-md rounded-t-lg"
            />
            <div className="p-3">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                asChild
              >
                <a href={media.webUrl} download={media.filename}>
                  <Download className="h-3 w-3 mr-1" />
                  Download {media.filename}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    case "document":
    default:
      return (
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href={media.webUrl} download={media.filename}>
            <FileText className="h-4 w-4" />
            <span className="truncate">{media.filename}</span>
            <Download className="h-3 w-3" />
          </a>
        </Button>
      );
  }
}
