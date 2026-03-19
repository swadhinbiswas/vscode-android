import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cn,
  formatRelativeTime,
  formatFileSize,
  getLanguageFromExtension,
  debounce,
  throttle,
  generateId,
  truncate,
  escapeHtml,
  fuzzyMatch,
  levenshteinDistance,
} from '../lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges tailwind classes', () => {
      expect(cn('px-2', 'py-2')).toBe('px-2 py-2');
    });

    it('handles conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('resolves conflicts', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats recent time', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('formats minutes ago', () => {
      const minsAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(minsAgo)).toBe('5m ago');
    });

    it('formats hours ago', () => {
      const hoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(hoursAgo)).toBe('3h ago');
    });

    it('formats days ago', () => {
      const daysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(daysAgo)).toBe('2d ago');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(100)).toBe('100 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('getLanguageFromExtension', () => {
    it('detects TypeScript', () => {
      expect(getLanguageFromExtension('ts')).toBe('typescript');
      expect(getLanguageFromExtension('tsx')).toBe('typescript');
    });

    it('detects JavaScript', () => {
      expect(getLanguageFromExtension('js')).toBe('javascript');
      expect(getLanguageFromExtension('jsx')).toBe('javascript');
    });

    it('detects other languages', () => {
      expect(getLanguageFromExtension('py')).toBe('python');
      expect(getLanguageFromExtension('rs')).toBe('rust');
      expect(getLanguageFromExtension('go')).toBe('go');
    });

    it('returns plaintext for unknown', () => {
      expect(getLanguageFromExtension('unknown')).toBe('plaintext');
    });
  });

  describe('debounce', () => {
    it('delays function execution', async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('cancels previous calls', async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('throttle', () => {
    it('limits function calls', async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('generates string IDs', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('Hello World', 5)).toBe('He...');
    });

    it('does not truncate short strings', () => {
      expect(truncate('Hi', 5)).toBe('Hi');
    });

    it('handles exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('escapeHtml', () => {
    it('escapes special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      );
    });

    it('handles ampersand', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('handles quotes', () => {
      expect(escapeHtml("It's \"quoted\"")).toBe('It&#039;s &quot;quoted&quot;');
    });
  });

  describe('fuzzyMatch', () => {
    it('scores exact matches highest', () => {
      expect(fuzzyMatch('test', 'test')).toBe(100);
    });

    it('scores starts-with high', () => {
      expect(fuzzyMatch('test', 'testing')).toBeGreaterThanOrEqual(70);
    });

    it('scores contains medium', () => {
      expect(fuzzyMatch('test', 'a test string')).toBeGreaterThanOrEqual(50);
    });

    it('returns 0 for no match', () => {
      expect(fuzzyMatch('xyz', 'abc')).toBe(0);
    });
  });

  describe('levenshteinDistance', () => {
    it('calculates distance for identical strings', () => {
      expect(levenshteinDistance('abc', 'abc')).toBe(0);
    });

    it('calculates distance for different strings', () => {
      expect(levenshteinDistance('abc', 'abd')).toBe(1);
    });

    it('handles empty strings', () => {
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', '')).toBe(3);
    });
  });
});

describe('deepClone', () => {
  it('clones objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = JSON.parse(JSON.stringify(obj));
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
  });
});

describe('shallowEqual', () => {
  it('compares shallow equality', () => {
    expect({ a: 1 }).toEqual({ a: 1 });
  });
});

describe('parseDiff', () => {
  it('parses diff output', () => {
    const diff = '+added\n-removed\n context';
    expect(diff).toContain('added');
  });
});
