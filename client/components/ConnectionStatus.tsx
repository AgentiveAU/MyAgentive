import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className="gap-1.5 cursor-help"
          >
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isConnected
              ? "WebSocket connection active"
              : "WebSocket connection lost. Reconnecting..."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
