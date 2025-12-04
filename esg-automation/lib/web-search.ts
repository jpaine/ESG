import OpenAI from 'openai';
import { DEFAULT_OPENAI_MODEL, DEFAULT_TEMPERATURE, WEB_SEARCH_MAX_TOKENS, WEB_SEARCH_DELAY_MS } from './constants';
import { log } from './logger';

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevanceScore?: number;
}

export interface SearchResults {
  query: string;
  results: SearchResult[];
  timestamp: string;
}

// Concurrency limit for parallel web searches
const MAX_CONCURRENT_SEARCHES = 3;

/**
 * Execute a single search query
 */
async function executeSearchQuery(
  companyName: string,
  query: string,
  timestamp: string
): Promise<{ query: string; results: SearchResults }> {
  const fullQuery = `${companyName} ${query}`;
  log.info(`[WEB SEARCH] Searching: "${fullQuery}"`, { companyName, query });
  
  try {
    const searchPrompt = `Based on your knowledge, search for information about: "${fullQuery}".

Provide specific, verifiable facts including:
- Company name and context
- Specific dates, incidents, or events (if known)
- Regulatory actions or breaches (if any)
- Public disclosures or reports
- News articles or official statements

Focus on:
- ESG-related information
- Regulatory compliance issues
- Supply chain problems
- Transparency and disclosure
- Public records or reports

If you find relevant information, provide details with context. If no information is found in your knowledge base, state clearly: "No relevant information found in knowledge base."

Be specific and factual. Include dates, locations, or context when available.`;

    const openai = getOpenAI();
    const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant that searches for and summarizes information. Provide accurate, factual information with context from your knowledge base. Cite what you find or state clearly if nothing is found. Be specific about dates, events, and sources when available.',
        },
        {
          role: 'user',
          content: searchPrompt,
        },
      ],
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: WEB_SEARCH_MAX_TOKENS,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse the response into structured results
    const searchResults: SearchResult[] = [];
    
    if (content.toLowerCase().includes('no relevant information found') || 
        content.toLowerCase().includes('no information found') ||
        content.toLowerCase().includes('could not find') ||
        content.toLowerCase().includes('not available in my knowledge')) {
      log.info(`[WEB SEARCH] No results found for: "${fullQuery}"`, { companyName, query });
    } else {
      // Extract information from the response
      searchResults.push({
        title: `Search Results: ${fullQuery}`,
        url: 'OpenAI Knowledge Base',
        snippet: content,
        relevanceScore: 0.8,
      });
      
      log.info(`[WEB SEARCH] Found information for: "${fullQuery}"`, { 
        companyName, 
        query,
        contentLength: content.length 
      });
    }
    
    return {
      query,
      results: {
        query: fullQuery,
        results: searchResults,
        timestamp,
      },
    };
  } catch (queryError) {
    log.error(`[WEB SEARCH] Search query failed: ${query}`, {
      companyName,
      query: fullQuery,
      error: queryError instanceof Error ? queryError.message : String(queryError),
    });
    
    // Return empty results on failure
    return {
      query,
      results: {
        query: fullQuery,
        results: [],
        timestamp,
      },
    };
  }
}

/**
 * Process queries in parallel with concurrency limit
 */
async function processQueriesInParallel(
  companyName: string,
  queries: string[],
  timestamp: string
): Promise<Map<string, SearchResults>> {
  const results = new Map<string, SearchResults>();
  
  // Process queries in batches with concurrency limit
  for (let i = 0; i < queries.length; i += MAX_CONCURRENT_SEARCHES) {
    const batch = queries.slice(i, i + MAX_CONCURRENT_SEARCHES);
    
    const batchPromises = batch.map(query => executeSearchQuery(companyName, query, timestamp));
    const batchResults = await Promise.all(batchPromises);
    
    // Store results
    batchResults.forEach(({ query, results: searchResults }) => {
      results.set(query, searchResults);
    });
    
    // Add delay between batches to avoid rate limits
    if (i + MAX_CONCURRENT_SEARCHES < queries.length) {
      await new Promise(resolve => setTimeout(resolve, WEB_SEARCH_DELAY_MS));
    }
  }
  
  return results;
}

/**
 * Search for company ESG information using OpenAI's knowledge and reasoning
 * Uses OpenAI chat completion to search for information the model has knowledge of
 * Note: This uses OpenAI's training data knowledge. For real-time web search,
 * consider integrating SerpAPI, Google Custom Search API, or similar services.
 * 
 * Now processes queries in parallel with concurrency limits for better performance.
 */
export async function searchCompanyInfo(
  companyName: string,
  queries: string[]
): Promise<Map<string, SearchResults>> {
  const timestamp = new Date().toISOString();
  
  log.info(`[WEB SEARCH] Starting information search for company: ${companyName}`, {
    companyName,
    queryCount: queries.length,
  });
  
  try {
    const results = await processQueriesInParallel(companyName, queries, timestamp);
    
    const totalResults = Array.from(results.values()).reduce((sum, r) => sum + r.results.length, 0);
    log.info(`[WEB SEARCH] Completed. Total results: ${totalResults} across ${results.size} queries`, {
      companyName,
      totalResults,
      queryCount: results.size,
    });
    
    return results;
  } catch (error) {
    log.error('[WEB SEARCH] Web search failed', {
      companyName,
      queriesCount: queries.length,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return empty results for all queries on failure
    const results = new Map<string, SearchResults>();
    queries.forEach(query => {
      results.set(query, {
        query: `${companyName} ${query}`,
        results: [],
        timestamp,
      });
    });
    
    return results;
  }
}

/**
 * Search specifically for track record information
 */
export async function searchTrackRecord(companyName: string): Promise<SearchResults[]> {
  const trackRecordQueries = [
    'regulatory breaches ESG compliance violations',
    'supply chain violations labor issues',
    'financial audit qualified opinion restatement',
    'ESG reporting sustainability disclosure',
    'transparency disclosure public records',
  ];
  
  const results = await searchCompanyInfo(companyName, trackRecordQueries);
  return Array.from(results.values());
}

/**
 * Search for company ESG policies and practices
 */
export async function searchESGPractices(companyName: string): Promise<SearchResults[]> {
  const esgQueries = [
    'ESG policy sustainability practices',
    'environmental policy climate action',
    'social responsibility labor standards',
    'governance policies board structure',
    'ESG reporting sustainability report',
  ];
  
  const results = await searchCompanyInfo(companyName, esgQueries);
  return Array.from(results.values());
}

/**
 * Format search results for LLM prompt inclusion
 */
export function formatSearchResultsForPrompt(searchResults: Map<string, SearchResults> | SearchResults[]): string {
  let formatted = '\n\n=== WEB SEARCH RESULTS (External Verification) ===\n';
  
  const resultsArray = Array.isArray(searchResults) 
    ? searchResults.map(sr => ({ query: sr.query, results: sr.results }))
    : Array.from(searchResults.entries()).map(([query, sr]) => ({ query, results: sr.results }));
  
  if (resultsArray.length === 0 || resultsArray.every(sr => sr.results.length === 0)) {
    formatted += 'No additional information found through web search.\n';
    return formatted;
  }
  
  resultsArray.forEach(({ query, results }) => {
    if (results.length > 0) {
      formatted += `\nQuery: "${query}"\n`;
      results.forEach((result, idx) => {
        formatted += `Result ${idx + 1}:\n`;
        formatted += `  ${result.snippet}\n`;
        if (result.url && result.url !== 'OpenAI Knowledge Base') {
          formatted += `  Source: ${result.url}\n`;
        }
        formatted += '\n';
      });
    }
  });
  
  formatted += '=== END WEB SEARCH RESULTS ===\n';
  
  return formatted;
}

