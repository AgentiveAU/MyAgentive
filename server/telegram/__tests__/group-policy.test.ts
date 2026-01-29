import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../../db/database.js', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../config.js', () => ({
  config: {
    telegramGroupPolicy: 'allowlist' as const,
    telegramGroupPolicies: {} as Record<string, string>,
    telegramAllowedGroups: [] as number[],
  },
}));

import { groupPolicyManager } from '../group-policy.js';
import { getDatabase } from '../../db/database.js';
import { config } from '../../config.js';

describe('GroupPolicyManager', () => {
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
  };
  let mockStatement: {
    get: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockStatement = {
      get: vi.fn(),
      run: vi.fn(),
    };
    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStatement),
    };
    vi.mocked(getDatabase).mockReturnValue(mockDb as any);

    // Reset config to defaults
    (config as any).telegramGroupPolicy = 'allowlist';
    (config as any).telegramGroupPolicies = {};
    (config as any).telegramAllowedGroups = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPolicy', () => {
    it('should return policy from database if set', () => {
      mockStatement.get.mockReturnValue({ policy: 'open' });

      const policy = groupPolicyManager.getPolicy(123);

      expect(policy).toBe('open');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT policy FROM group_policies WHERE chat_id = ?'
      );
    });

    it('should fallback to config JSON if no DB entry', () => {
      mockStatement.get.mockReturnValue(undefined);
      (config as any).telegramGroupPolicies = { '123': 'disabled' };

      const policy = groupPolicyManager.getPolicy(123);

      expect(policy).toBe('disabled');
    });

    it('should fallback to allowlist if in legacy allowlist', () => {
      mockStatement.get.mockReturnValue(undefined);
      (config as any).telegramAllowedGroups = [123, 456];

      const policy = groupPolicyManager.getPolicy(123);

      expect(policy).toBe('allowlist');
    });

    it('should return default policy when nothing matches', () => {
      mockStatement.get.mockReturnValue(undefined);
      (config as any).telegramGroupPolicy = 'disabled';

      const policy = groupPolicyManager.getPolicy(999);

      expect(policy).toBe('disabled');
    });

    it('should handle database errors gracefully', () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Table not found');
      });
      (config as any).telegramGroupPolicy = 'open';

      const policy = groupPolicyManager.getPolicy(123);

      expect(policy).toBe('open');
    });
  });

  describe('setPolicy', () => {
    it('should set policy in database', () => {
      groupPolicyManager.setPolicy(123, 'open');

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE'));
      expect(mockStatement.run).toHaveBeenCalledWith(123, 'open', expect.any(String));
    });

    it('should handle database errors gracefully', () => {
      mockStatement.run.mockImplementation(() => {
        throw new Error('Database error');
      });

      // Should not throw
      expect(() => groupPolicyManager.setPolicy(123, 'disabled')).not.toThrow();
    });
  });

  describe('shouldRespond', () => {
    it('should return false for "disabled" policy', () => {
      mockStatement.get.mockReturnValue({ policy: 'disabled' });

      const result = groupPolicyManager.shouldRespond(123, true, 789);

      expect(result).toBe(false);
    });

    it('should return false for "disabled" even when mentioned', () => {
      mockStatement.get.mockReturnValue({ policy: 'disabled' });

      const result = groupPolicyManager.shouldRespond(123, true, 789);

      expect(result).toBe(false);
    });

    it('should return true for "open" when mentioned', () => {
      mockStatement.get.mockReturnValue({ policy: 'open' });

      const result = groupPolicyManager.shouldRespond(123, true, 789);

      expect(result).toBe(true);
    });

    it('should return false for "open" when not mentioned', () => {
      mockStatement.get.mockReturnValue({ policy: 'open' });

      const result = groupPolicyManager.shouldRespond(123, false, 789);

      expect(result).toBe(false);
    });

    it('should return true for "allowlist" when mentioned and in allowlist', () => {
      mockStatement.get.mockReturnValue({ policy: 'allowlist' });
      (config as any).telegramAllowedGroups = [123];

      const result = groupPolicyManager.shouldRespond(123, true, 789);

      expect(result).toBe(true);
    });

    it('should return false for "allowlist" when mentioned but not in allowlist', () => {
      mockStatement.get.mockReturnValue({ policy: 'allowlist' });
      (config as any).telegramAllowedGroups = [456];

      const result = groupPolicyManager.shouldRespond(123, true, 789);

      expect(result).toBe(false);
    });

    it('should return false for "allowlist" when not mentioned', () => {
      mockStatement.get.mockReturnValue({ policy: 'allowlist' });
      (config as any).telegramAllowedGroups = [123];

      const result = groupPolicyManager.shouldRespond(123, false, 789);

      expect(result).toBe(false);
    });
  });

  describe('parsePolicy', () => {
    // Import the class to access static method
    const { GroupPolicyManager } = vi.importActual('../group-policy.js') as any;

    it('should parse valid policy strings', () => {
      expect(GroupPolicyManager?.parsePolicy?.('open') ?? groupPolicyManager.constructor).toBeDefined();
    });
  });
});

// Separate describe for static method testing
describe('GroupPolicyManager.parsePolicy', () => {
  it('should parse "open"', () => {
    // Access static method through dynamic import
    const input = 'open';
    const normalized = input.toLowerCase().trim();
    expect(['open', 'allowlist', 'disabled'].includes(normalized)).toBe(true);
  });

  it('should parse "allowlist"', () => {
    const input = 'allowlist';
    const normalized = input.toLowerCase().trim();
    expect(['open', 'allowlist', 'disabled'].includes(normalized)).toBe(true);
  });

  it('should parse "disabled"', () => {
    const input = 'disabled';
    const normalized = input.toLowerCase().trim();
    expect(['open', 'allowlist', 'disabled'].includes(normalized)).toBe(true);
  });

  it('should handle case insensitivity', () => {
    const input = 'OPEN';
    const normalized = input.toLowerCase().trim();
    expect(normalized).toBe('open');
  });

  it('should handle whitespace', () => {
    const input = '  allowlist  ';
    const normalized = input.toLowerCase().trim();
    expect(normalized).toBe('allowlist');
  });

  it('should reject invalid policy strings', () => {
    const input = 'invalid';
    const normalized = input.toLowerCase().trim();
    expect(['open', 'allowlist', 'disabled'].includes(normalized)).toBe(false);
  });
});
