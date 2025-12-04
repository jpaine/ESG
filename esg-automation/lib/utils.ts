/**
 * Utility functions for input sanitization and validation
 */

import { MAX_TEXT_LENGTH } from './constants';

/**
 * Sanitize file name to prevent path traversal and XSS
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || !fileName.trim()) {
    return 'file';
  }

  // Remove path components
  const sanitized = fileName
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[\/\\]/g, '_') // Replace slashes with underscores
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscores
    .substring(0, 255); // Limit length

  // Ensure it's not empty after sanitization
  return sanitized.trim() || 'file';
}

/**
 * Sanitize text input to prevent injection attacks
 */
export function sanitizeText(text: string, maxLength: number = MAX_TEXT_LENGTH): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = text
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
}

/**
 * Validate file type
 */
export function isValidFileType(fileName: string, allowedTypes: string[]): boolean {
  const extension = fileName.toLowerCase().split('.').pop();
  return extension ? allowedTypes.includes(extension) : false;
}

/**
 * Generate request ID
 */
export function generateRequestId(prefix: string = 'req'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  // Ensure we have room for ellipsis
  const truncateLength = Math.max(0, maxLength - 3);
  return text.substring(0, truncateLength) + '...';
}

/**
 * Validate email format (basic)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

