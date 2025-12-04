import { NextResponse } from 'next/server';
import { getMetricsSummary } from '@/lib/metrics';
import { getFeatureFlags } from '@/lib/feature-flags';
import { log } from '@/lib/logger';

/**
 * Health check endpoint
 * Returns system status, API key availability, and metrics
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check API key availability
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    
    const apiKeysStatus = {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      gemini: hasGemini,
      hasAnyLLM: hasOpenAI || hasAnthropic,
      hasAllRequired: hasOpenAI && hasGemini, // OpenAI + Gemini are required
    };
    
    // Check RMF file accessibility (try to load it)
    let rmfStatus = 'unknown';
    try {
      // Quick check - try to access the public file
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/ESG_RMF.txt`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      
      rmfStatus = response.ok ? 'available' : 'unavailable';
    } catch {
      rmfStatus = 'unavailable';
    }
    
    // Get metrics summary
    const metrics = getMetricsSummary();
    
    // Get feature flags
    const featureFlags = getFeatureFlags();
    
    // Determine overall health
    const isHealthy = 
      apiKeysStatus.hasAllRequired &&
      rmfStatus === 'available';
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime,
      apiKeys: apiKeysStatus,
      rmfFile: {
        status: rmfStatus,
        location: 'public/ESG_RMF.txt',
      },
      metrics: {
        totalRequests: metrics.totalRequests,
        totalErrors: metrics.totalErrors,
        averageResponseTime: metrics.averageResponseTime,
        errorRate: `${metrics.errorRate}%`,
      },
      featureFlags: {
        webSearch: featureFlags.enableWebSearch,
        rateLimiting: featureFlags.enableRateLimiting,
        metrics: featureFlags.enableMetrics,
      },
    };
    
    log.info('[HEALTH] Health check completed', healthStatus);
    
    return NextResponse.json(healthStatus, {
      status: isHealthy ? 200 : 503,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    log.error('[HEALTH] Health check failed', {
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    });
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      },
      { status: 503 }
    );
  }
}

