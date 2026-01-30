import { Activity } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ContextIndicatorProps {
  usedTokens: number;
  maxTokens: number;
  usedPercentage: number;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function getColourClass(percentage: number): string {
  if (percentage >= 90) {
    return "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30";
  }
  if (percentage >= 70) {
    return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30";
  }
  return "bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30";
}

function getProgressColour(percentage: number): string {
  if (percentage >= 90) {
    return "bg-red-500";
  }
  if (percentage >= 70) {
    return "bg-yellow-500";
  }
  return "bg-green-500";
}

export function ContextIndicator({
  usedTokens,
  maxTokens,
  usedPercentage,
}: ContextIndicatorProps) {
  const colourClass = getColourClass(usedPercentage);
  const progressColour = getProgressColour(usedPercentage);
  const isWarning = usedPercentage >= 80;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1.5 cursor-help border ${colourClass}`}
          >
            <Activity className="h-3 w-3" />
            <span className="hidden sm:inline">{usedPercentage}%</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Context Usage</span>
              <span className="font-medium">{usedPercentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${progressColour}`}
                style={{ width: `${Math.min(usedPercentage, 100)}%` }}
              />
            </div>

            {/* Token counts */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTokens(usedTokens)} used</span>
              <span>{formatTokens(maxTokens)} max</span>
            </div>

            {/* Warning message */}
            {isWarning && (
              <p className="text-xs text-yellow-500 mt-1">
                Context is filling up. Older messages may be compacted soon.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
