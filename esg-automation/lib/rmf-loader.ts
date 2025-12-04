import fs from 'fs';
import path from 'path';
import { log } from './logger';

let cachedRMF: string | null = null;

/**
 * Loads the ESG Risk Management Framework document
 * Caches the result to avoid repeated file reads
 * Works in both development and Vercel production
 * Uses file system in development, fetch in production as fallback
 */
export async function loadRMF(): Promise<string> {
  if (cachedRMF) {
    return cachedRMF;
  }

  // Try file system first (works in local development)
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'ESG_RMF.txt'),
    path.join(process.cwd(), 'ESG_RMF.txt'),
    path.resolve('./public/ESG_RMF.txt'),
  ];

  let filePath: string | null = null;
  for (const possiblePath of possiblePaths) {
    try {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    } catch {
      // Continue to next path
    }
  }

  // Try reading from file system if path found
  if (filePath) {
    try {
      cachedRMF = fs.readFileSync(filePath, 'utf-8');
      log.info('[RMF LOADER] Successfully loaded RMF from file system', { 
        filePath,
        length: cachedRMF.length 
      });
      return cachedRMF;
    } catch (error) {
      log.warn('[RMF LOADER] File system read failed, trying fetch fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
      // Fall through to fetch-based approach
    }
  }

  // Fallback to fetch-based approach for Vercel production
  // In Vercel, public files are served from the public directory via CDN
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (isProduction) {
    // Try multiple URL strategies for maximum reliability
    const possibleUrls = [
      // Use Vercel production URL if available (most reliable)
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/ESG_RMF.txt` : null,
      // Use custom base URL if configured
      process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/ESG_RMF.txt` : null,
      // Fallback to localhost (shouldn't happen in production, but helps with testing)
      'http://localhost:3000/ESG_RMF.txt',
    ].filter((url): url is string => url !== null);

    for (const url of possibleUrls) {
      try {
        log.info('[RMF LOADER] Attempting to fetch RMF', { url });
        
        // Add cache control for CDN caching (Vercel CDN will cache this)
        const response = await fetch(url, {
          cache: 'force-cache', // Use CDN cache when available
          next: { revalidate: 3600 }, // Revalidate every hour
        });
        
        if (!response.ok) {
          log.warn('[RMF LOADER] Fetch failed with status', { 
            url, 
            status: response.status,
            statusText: response.statusText 
          });
          continue; // Try next URL
        }
        
        cachedRMF = await response.text();
        
        if (!cachedRMF || cachedRMF.trim().length === 0) {
          log.warn('[RMF LOADER] Fetched RMF is empty', { url });
          continue; // Try next URL
        }
        
        log.info('[RMF LOADER] Successfully loaded RMF via fetch', {
          length: cachedRMF.length,
          url,
        });
        return cachedRMF;
      } catch (fetchError) {
        log.warn('[RMF LOADER] Fetch attempt failed', {
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          url,
        });
        // Continue to next URL
      }
    }
    
    // If all fetch attempts failed
    log.error('[RMF LOADER] All fetch attempts failed', {
      attemptedUrls: possibleUrls,
    });
  }

  // If all methods failed, throw error
  throw new Error(
    'ESG_RMF.txt not found. Please ensure the file exists in the public directory and is committed to Git.'
  );
}

