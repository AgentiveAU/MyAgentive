import { cn } from "@/lib/utils";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClick?: () => void;
  className?: string;
}

export function HamburgerMenu({ isOpen, onClick, className }: HamburgerMenuProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-md",
        "hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "transition-colors",
        className
      )}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      <div className="flex h-5 w-5 flex-col items-center justify-center">
        {/* Top bar */}
        <span
          className={cn(
            "absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out",
            isOpen ? "rotate-45" : "-translate-y-1.5"
          )}
        />
        {/* Middle bar */}
        <span
          className={cn(
            "absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out",
            isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        />
        {/* Bottom bar */}
        <span
          className={cn(
            "absolute h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out",
            isOpen ? "-rotate-45" : "translate-y-1.5"
          )}
        />
      </div>
    </button>
  );
}
