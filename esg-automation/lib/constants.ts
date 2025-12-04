/**
 * Application constants
 * Centralized configuration values to avoid magic numbers throughout the codebase
 */

// File upload limits
export const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes (Vercel's request body limit)
export const MAX_FILE_SIZE_MB = 4.5;

// Text processing limits
export const MAX_TEXT_LENGTH = 20000; // Maximum text length for LLM analysis
export const MIN_BUSINESS_ACTIVITIES_LENGTH = 50; // Minimum characters for business activities
export const MIN_PRODUCT_DESCRIPTION_LENGTH = 50; // Minimum characters for product description
export const TEXT_PREVIEW_LENGTH = 500; // Length for text previews in logs

// LLM Configuration
export const DEFAULT_LLM_PROVIDER = 'openai';
export const DEFAULT_OPENAI_MODEL = 'gpt-4-turbo-preview';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_TEMPERATURE = 0.3;
export const DEFAULT_MAX_TOKENS = 4096;

// LLM Retry Configuration
export const MAX_RETRY_ATTEMPTS = 3;
export const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
export const MAX_RETRY_DELAY_MS = 10000; // 10 seconds
export const RETRY_MULTIPLIER = 2;

// Web Search Configuration
export const WEB_SEARCH_DELAY_MS = 500; // Delay between web search queries
export const WEB_SEARCH_MAX_TOKENS = 1000;

// Gemini API Configuration
export const GEMINI_TIMEOUT_MS = 240000; // 4 minutes for PDF processing

// API Timeout Configuration
export const API_TIMEOUT_MS = 300000; // 5 minutes (matches Vercel function timeout)

// Rate Limiting Configuration
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 10; // Requests per minute per IP
export const RATE_LIMIT_REQUESTS_PER_HOUR = 100; // Requests per hour per IP

// Request ID Configuration
export const REQUEST_ID_LENGTH = 9; // Length of random string in request IDs

