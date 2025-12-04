import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  DEFAULT_LLM_PROVIDER,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  MAX_RETRY_ATTEMPTS,
  INITIAL_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
  RETRY_MULTIPLIER,
} from './constants';
import { LLMError, isRetryableError } from './errors';
import { log } from './logger';

// Lazy initialization to avoid build-time errors when env vars aren't set
let openaiInstance: OpenAI | null = null;
let anthropicInstance: Anthropic | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

function getAnthropic(): Anthropic {
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicInstance;
}

type LLMProvider = 'openai' | 'anthropic';

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_MULTIPLIER, attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}


export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Internal function to make a single LLM API call (without retry)
 */
async function callLLMOnce(
  prompt: string,
  systemPrompt: string | undefined,
  provider: LLMProvider
): Promise<LLMResponse> {
  if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    const anthropic = getAnthropic();
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    const message = await anthropic.messages.create({
      model,
      max_tokens: DEFAULT_MAX_TOKENS,
      system: systemPrompt || 'You are a helpful assistant that analyzes ESG compliance for investment companies.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return {
      content: message.content[0].type === 'text' ? message.content[0].text : '',
      usage: message.usage ? {
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
      } : undefined,
    };
  } else {
    // Default to OpenAI
    if (!process.env.OPENAI_API_KEY) {
      throw new LLMError('OPENAI_API_KEY is not set', provider);
    }
    
    const openai = getOpenAI();
    const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const response = await openai.chat.completions.create({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt },
      ],
      temperature: DEFAULT_TEMPERATURE,
    });

    const result = {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      } : undefined,
    };
    
      if (!result.content) {
        logger.warn('OpenAI API returned empty content', 'LLM', {
          responseId: response.id,
          choices: response.choices.length,
          finishReason: response.choices[0]?.finish_reason,
        });
      }
    
    return result;
  }
}

/**
 * Call LLM with a prompt and return the response
 * Includes retry logic with exponential backoff
 */
export async function callLLM(
  prompt: string,
  systemPrompt?: string,
  provider: LLMProvider = DEFAULT_LLM_PROVIDER as LLMProvider
): Promise<LLMResponse> {
  const startTime = Date.now();
  const requestInfo = {
    provider,
    promptLength: prompt.length,
    systemPromptLength: systemPrompt?.length || 0,
    hasApiKey: provider === 'openai' ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY,
  };
  
  log.llm(`Starting ${provider} API call`, provider, requestInfo);
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await callLLMOnce(prompt, systemPrompt, provider);
      const responseTime = Date.now() - startTime;
      
      log.llm(`${provider} API call successful`, provider, {
        responseTime,
        attempt,
        responseLength: response.content.length,
        usage: response.usage,
      });
      
      return response;
    } catch (error) {
      lastError = error;
      const responseTime = Date.now() - startTime;
      
      // Check for non-retryable errors
      if (error instanceof Error) {
        // Don't retry authentication errors
        if (error.message.includes('API key') || error.message.includes('authentication')) {
          log.llmError('API authentication failed', provider, {
            ...requestInfo,
            responseTime,
            errorType: 'authentication',
            attempt,
            error: error instanceof Error ? error.message : String(error),
          });
          throw new LLMError(
            `LLM API authentication failed. Please check your ${provider.toUpperCase()} API key.`,
            provider
          );
        }
      }
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        log.llmError('Non-retryable error', provider, {
          ...requestInfo,
          responseTime,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      
      // If this is the last attempt, don't wait
      if (attempt === MAX_RETRY_ATTEMPTS) {
        log.llmError('Max retry attempts reached', provider, {
          ...requestInfo,
          responseTime,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
      
      // Calculate delay and wait before retrying
      const delay = calculateRetryDelay(attempt);
      log.llm(`Retryable error on attempt ${attempt}/${MAX_RETRY_ATTEMPTS}, retrying in ${delay}ms`, provider, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        delay,
      });
      
      await sleep(delay);
    }
  }
  
  // If we get here, all retries failed
  const responseTime = Date.now() - startTime;
  log.llmError('LLM API call failed after all retries', provider, {
    ...requestInfo,
    responseTime,
    attempts: MAX_RETRY_ATTEMPTS,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  
  if (lastError instanceof Error) {
    if (lastError.message.includes('rate limit') || lastError.message.includes('429')) {
      throw new LLMError('LLM API rate limit exceeded. Please try again later.', provider);
    }
    
    if (lastError.message.includes('timeout') || lastError.message.includes('ETIMEDOUT')) {
      throw new LLMError('LLM API request timed out. Please try again.', provider);
    }
  }
  
  throw new LLMError(
    `LLM API call failed after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
    provider
  );
}

/**
 * Call LLM with JSON response format
 */
export async function callLLMJSON<T>(
  prompt: string,
  systemPrompt?: string,
  provider: LLMProvider = DEFAULT_LLM_PROVIDER as LLMProvider
): Promise<T> {
  const startTime = Date.now();
  log.llm('Starting JSON extraction', provider, { promptLength: prompt.length });
  
  try {
    const response = await callLLM(
      `${prompt}\n\nRespond with valid JSON only, no markdown formatting.`,
      systemPrompt,
      provider
    );

    if (!response.content || !response.content.trim()) {
      const error = new LLMError('LLM returned empty response', provider);
      log.llmError('Empty LLM response', provider, {
        promptLength: prompt.length,
      });
      throw error;
    }

    try {
      // Remove markdown code blocks if present
      let cleaned = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to extract JSON if it's embedded in other text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleaned) as T;
      const parseTime = Date.now() - startTime;
      
      log.llm('Successfully parsed JSON response', provider, {
        parseTime,
        responseLength: response.content.length,
        cleanedLength: cleaned.length,
        parsedKeys: Object.keys(parsed as object),
      });
      
      return parsed;
    } catch (parseError) {
      const parseTime = Date.now() - startTime;
      log.llmError('JSON parsing failed', provider, {
        responseLength: response.content.length,
        responsePreview: response.content.substring(0, 500),
        parseTime,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      
      throw new LLMError(
        `Invalid JSON response from LLM. Response preview: ${response.content.substring(0, 200)}...`,
        provider
      );
    }
  } catch (error) {
    if (error instanceof LLMError && error.message.includes('Invalid JSON')) {
      throw error; // Re-throw JSON parsing errors as-is
    }
    
    log.llmError('JSON extraction failed', provider, {
      promptLength: prompt.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

