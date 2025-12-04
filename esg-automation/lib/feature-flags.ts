/**
 * Feature flags utility
 * Allows toggling features on/off via environment variables
 */

export interface FeatureFlags {
  enableWebSearch: boolean;
  enableProgressIndicators: boolean;
  enableMetrics: boolean;
  enableDataPersistence: boolean;
  llmProvider: 'openai' | 'anthropic' | 'auto';
  maxRetryAttempts: number;
  enableRateLimiting: boolean;
}

/**
 * Get feature flags from environment variables
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    // Web search can be disabled for faster processing
    enableWebSearch: process.env.ENABLE_WEB_SEARCH !== 'false',
    
    // Progress indicators (frontend feature)
    enableProgressIndicators: process.env.ENABLE_PROGRESS_INDICATORS !== 'false',
    
    // Metrics collection
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    
    // Data persistence (future feature)
    enableDataPersistence: process.env.ENABLE_DATA_PERSISTENCE === 'true',
    
    // LLM provider selection
    llmProvider: (process.env.LLM_PROVIDER as 'openai' | 'anthropic' | 'auto') || 'auto',
    
    // Retry attempts (can be reduced for faster failures)
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
    
    // Rate limiting (can be disabled for development)
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] === true;
}

/**
 * Get LLM provider based on feature flags and available API keys
 */
export function getLLMProvider(): 'openai' | 'anthropic' {
  const flags = getFeatureFlags();
  
  if (flags.llmProvider === 'openai') {
    return 'openai';
  }
  
  if (flags.llmProvider === 'anthropic') {
    return 'anthropic';
  }
  
  // Auto mode: prefer OpenAI, fallback to Anthropic
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  
  // Default to OpenAI
  return 'openai';
}

