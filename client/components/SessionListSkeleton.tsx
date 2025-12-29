import { Skeleton } from "./ui/skeleton";

export function SessionListSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
