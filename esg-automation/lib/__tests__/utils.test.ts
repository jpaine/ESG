import { describe, it, expect } from 'vitest';
import {
  sanitizeFileName,
  sanitizeText,
  isValidFileType,
  generateRequestId,
  truncateText,
  isValidEmail,
  isValidUrl,
} from '../utils';
import { MAX_TEXT_LENGTH } from '../constants';

describe('sanitizeFileName', () => {
  it('should remove path traversal attempts', () => {
    expect(sanitizeFileName('../../../etc/passwd')).not.toContain('..');
    expect(sanitizeFileName('file../../name.txt')).not.toContain('..');
  });

  it('should replace slashes with underscores', () => {
    expect(sanitizeFileName('path/to/file.txt')).not.toContain('/');
    expect(sanitizeFileName('path\\to\\file.txt')).not.toContain('\\');
  });

  it('should replace special characters', () => {
    const result = sanitizeFileName('file<script>alert("xss")</script>.txt');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('"');
  });

  it('should limit length to 255 characters', () => {
    const longName = 'a'.repeat(300) + '.txt';
    expect(sanitizeFileName(longName).length).toBeLessThanOrEqual(255);
  });

  it('should return default name for empty input', () => {
    expect(sanitizeFileName('')).toBe('file');
    expect(sanitizeFileName('   ')).toBe('file');
  });

  it('should preserve valid characters', () => {
    expect(sanitizeFileName('valid-file_name123.txt')).toBe('valid-file_name123.txt');
  });
});

describe('sanitizeText', () => {
  it('should remove null bytes', () => {
    const text = 'Hello\0World';
    expect(sanitizeText(text)).not.toContain('\0');
  });

  it('should remove control characters except newlines and tabs', () => {
    const text = 'Hello\x00\x01\x02World\nTab\tHere';
    const result = sanitizeText(text);
    expect(result).toContain('\n');
    expect(result).toContain('\t');
    expect(result).not.toContain('\x00');
  });

  it('should truncate to max length', () => {
    const longText = 'a'.repeat(MAX_TEXT_LENGTH + 100);
    expect(sanitizeText(longText).length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello world  ')).toBe('hello world');
  });

  it('should return empty string for invalid input', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(null as any)).toBe('');
    expect(sanitizeText(undefined as any)).toBe('');
  });

  it('should handle custom max length', () => {
    const text = 'a'.repeat(100);
    expect(sanitizeText(text, 50).length).toBeLessThanOrEqual(50);
  });
});

describe('isValidFileType', () => {
  it('should validate file extensions', () => {
    expect(isValidFileType('document.pdf', ['pdf', 'docx', 'txt'])).toBe(true);
    expect(isValidFileType('document.docx', ['pdf', 'docx', 'txt'])).toBe(true);
    expect(isValidFileType('document.txt', ['pdf', 'docx', 'txt'])).toBe(true);
  });

  it('should reject invalid extensions', () => {
    expect(isValidFileType('document.exe', ['pdf', 'docx', 'txt'])).toBe(false);
    expect(isValidFileType('document', ['pdf', 'docx', 'txt'])).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isValidFileType('document.PDF', ['pdf', 'docx', 'txt'])).toBe(true);
    expect(isValidFileType('document.DOCX', ['pdf', 'docx', 'txt'])).toBe(true);
  });
});

describe('generateRequestId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateRequestId('test');
    const id2 = generateRequestId('test');
    expect(id1).not.toBe(id2);
  });

  it('should include prefix', () => {
    const id = generateRequestId('test');
    expect(id).toMatch(/^test-/);
  });

  it('should generate different IDs for different prefixes', () => {
    const id1 = generateRequestId('prefix1');
    const id2 = generateRequestId('prefix2');
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^prefix1-/);
    expect(id2).toMatch(/^prefix2-/);
  });

  it('should use default prefix if not provided', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req-/);
  });
});

describe('truncateText', () => {
  it('should truncate long text with ellipsis', () => {
    const text = 'a'.repeat(100);
    const result = truncateText(text, 50);
    expect(result.length).toBe(50);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should not truncate short text', () => {
    const text = 'short text';
    expect(truncateText(text, 50)).toBe(text);
  });

  it('should handle exact length', () => {
    const text = 'a'.repeat(50);
    expect(truncateText(text, 50)).toBe(text);
  });
});

describe('isValidEmail', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('should validate correct URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com/path')).toBe(true);
    expect(isValidUrl('https://subdomain.example.com/path?query=value')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

