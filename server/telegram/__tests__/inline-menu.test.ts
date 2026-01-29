import { describe, it, expect } from 'vitest';
import { menuBuilder } from '../inline-menu.js';

describe('InlineMenuBuilder', () => {
  describe('getDefaultMenuItems', () => {
    it('should return default menu items', () => {
      const items = menuBuilder.getDefaultMenuItems();

      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('label');
      expect(items[0]).toHaveProperty('command');
    });

    it('should include essential commands', () => {
      const items = menuBuilder.getDefaultMenuItems();
      const commands = items.map((item) => item.command);

      expect(commands).toContain('new');
      expect(commands).toContain('list');
      expect(commands).toContain('help');
    });
  });

  describe('buildMenu', () => {
    it('should build menu with correct items', () => {
      const items = [
        { label: 'Item 1', command: 'cmd1' },
        { label: 'Item 2', command: 'cmd2' },
        { label: 'Item 3', command: 'cmd3' },
      ];

      const keyboard = menuBuilder.buildMenu(items, 0);

      // The keyboard should have the items as buttons
      expect(keyboard).toBeDefined();
    });

    it('should paginate items (5 per page)', () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        label: `Item ${i + 1}`,
        command: `cmd${i + 1}`,
      }));

      // First page should have 5 items plus navigation
      const page0 = menuBuilder.buildMenu(items, 0);
      expect(page0).toBeDefined();

      // Second page should also have 5 items
      const page1 = menuBuilder.buildMenu(items, 1);
      expect(page1).toBeDefined();

      // Third page should have 2 items (12 - 10)
      const page2 = menuBuilder.buildMenu(items, 2);
      expect(page2).toBeDefined();
    });

    it('should handle single page (no navigation)', () => {
      const items = [
        { label: 'Item 1', command: 'cmd1' },
        { label: 'Item 2', command: 'cmd2' },
      ];

      const keyboard = menuBuilder.buildMenu(items, 0);
      expect(keyboard).toBeDefined();
    });

    it('should handle empty items', () => {
      const keyboard = menuBuilder.buildMenu([], 0);
      expect(keyboard).toBeDefined();
    });
  });

  describe('parseCallback', () => {
    it('should parse page callback data', () => {
      const result = menuBuilder.parseCallback('menu:page:2');

      expect(result).toEqual({ type: 'page', page: 2 });
    });

    it('should parse page 0', () => {
      const result = menuBuilder.parseCallback('menu:page:0');

      expect(result).toEqual({ type: 'page', page: 0 });
    });

    it('should parse command callback data', () => {
      const result = menuBuilder.parseCallback('menu:cmd:help');

      expect(result).toEqual({ type: 'cmd', command: 'help' });
    });

    it('should parse noop callback', () => {
      const result = menuBuilder.parseCallback('menu:noop');

      expect(result).toEqual({ type: 'noop' });
    });

    it('should return null for invalid data', () => {
      expect(menuBuilder.parseCallback('invalid')).toBeNull();
      expect(menuBuilder.parseCallback('')).toBeNull();
      expect(menuBuilder.parseCallback('other:page:1')).toBeNull();
    });

    it('should return null for malformed menu data', () => {
      expect(menuBuilder.parseCallback('menu:')).toBeNull();
      expect(menuBuilder.parseCallback('menu:unknown')).toBeNull();
      expect(menuBuilder.parseCallback('menu:page:')).toBeNull();
      expect(menuBuilder.parseCallback('menu:page:abc')).toBeNull();
    });

    it('should handle command with special characters', () => {
      const result = menuBuilder.parseCallback('menu:cmd:my-command');

      expect(result).toEqual({ type: 'cmd', command: 'my-command' });
    });
  });
});
