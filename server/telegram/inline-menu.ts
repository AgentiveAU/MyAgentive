import { InlineKeyboard } from "grammy";

interface MenuItem {
  label: string;
  command: string;
  description?: string;
}

class InlineMenuBuilder {
  private itemsPerPage = 5;

  /**
   * Build a paginated menu keyboard.
   */
  buildMenu(items: MenuItem[], currentPage: number = 0): InlineKeyboard {
    const totalPages = Math.ceil(items.length / this.itemsPerPage);
    const startIndex = currentPage * this.itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + this.itemsPerPage);

    const keyboard = new InlineKeyboard();

    // Add menu items
    for (const item of pageItems) {
      keyboard.text(item.label, `menu:cmd:${item.command}`).row();
    }

    // Add navigation row if needed
    if (totalPages > 1) {
      if (currentPage > 0) {
        keyboard.text("< Prev", `menu:page:${currentPage - 1}`);
      }

      keyboard.text(`${currentPage + 1}/${totalPages}`, "menu:noop");

      if (currentPage < totalPages - 1) {
        keyboard.text("Next >", `menu:page:${currentPage + 1}`);
      }
    }

    return keyboard;
  }

  /**
   * Get default menu items.
   */
  getDefaultMenuItems(): MenuItem[] {
    return [
      { label: "New Session", command: "new", description: "Create a new session" },
      { label: "List Sessions", command: "list", description: "Show all sessions" },
      { label: "Current Status", command: "status", description: "Show current session" },
      { label: "Change Model", command: "model", description: "Switch AI model" },
      { label: "Usage Stats", command: "usage", description: "Show usage info" },
      { label: "Reply Mode", command: "replymode", description: "Change reply threading" },
      { label: "Help", command: "help", description: "Show help message" },
    ];
  }

  /**
   * Parse menu callback data.
   * Returns { type: 'page', page: number } or { type: 'cmd', command: string } or null
   */
  parseCallback(
    data: string
  ): { type: "page"; page: number } | { type: "cmd"; command: string } | { type: "noop" } | null {
    if (!data.startsWith("menu:")) {
      return null;
    }

    const parts = data.split(":");
    if (parts.length < 2) return null;

    const action = parts[1];

    if (action === "page" && parts[2]) {
      const page = parseInt(parts[2], 10);
      if (!isNaN(page)) {
        return { type: "page", page };
      }
    }

    if (action === "cmd" && parts[2]) {
      return { type: "cmd", command: parts[2] };
    }

    if (action === "noop") {
      return { type: "noop" };
    }

    return null;
  }
}

export const menuBuilder = new InlineMenuBuilder();
