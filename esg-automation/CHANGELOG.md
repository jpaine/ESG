# Changelog

## Phase 3 Improvements (Current)

### Metrics & Analytics
- ✅ Created metrics utility for tracking API usage, performance, and errors
- ✅ Integrated metrics tracking into API routes (with feature flag support)
- ✅ Metrics include: request counts, error rates, response times, LLM call tracking

### Feature Flags
- ✅ Created feature flags system for toggling features via environment variables
- ✅ Flags for: web search, progress indicators, metrics, rate limiting, LLM provider selection
- ✅ Integrated into API routes for conditional feature execution

### Health Check
- ✅ Added `/api/health` endpoint for system status monitoring
- ✅ Checks API key availability, RMF file accessibility, and system health
- ✅ Returns metrics summary and feature flag status

### Data Persistence
- ✅ Created client-side storage utilities (localStorage-based)
- ✅ Automatic saving of assessments after document generation
- ✅ Functions for loading, deleting, and managing stored assessments

### Export Functionality
- ✅ Added JSON export for assessments
- ✅ Added CSV export for assessments
- ✅ Export buttons in DDQ and IM review sections

## Phase 2 Improvements

### Testing
- ✅ Added Vitest testing framework
- ✅ Unit tests for utility functions (sanitization, validation)
- ✅ Unit tests for error handling utilities
- ✅ Unit tests for rate limiting logic
- ✅ 53 tests passing with full coverage of critical functions

### Documentation
- ✅ Complete API documentation (docs/API.md)
- ✅ Request/response examples for all endpoints
- ✅ Error code reference
- ✅ Best practices guide

### Performance
- ✅ Enhanced RMF file caching with multiple URL fallbacks
- ✅ CDN cache utilization for RMF file in production
- ✅ Improved error handling and retry logic

## Phase 1 Improvements

### High Priority
- ✅ Extracted magic numbers to constants file
- ✅ Created standardized error handling utilities
- ✅ Added input sanitization for file names and text inputs
- ✅ Added retry logic for LLM calls with exponential backoff
- ✅ Added rate limiting to all API routes
- ✅ Updated all API routes to use standardized error handling

### Medium Priority
- ✅ Created structured logging utility (replaced console.log)
- ✅ Parallelized web searches with concurrency limits
- ✅ Added request timeout handling
- ✅ Enhanced model name configuration via environment variables
- ✅ Added progress indicators for DDQ and IM generation (frontend)
- ✅ Improved DDQ materiality assessment accuracy
- ✅ Enhanced DDQ comment quality with direct evidence citations

## Files Added

### Phase 2
- `vitest.config.ts` - Testing configuration
- `lib/__tests__/utils.test.ts` - Utility function tests
- `lib/__tests__/errors.test.ts` - Error handling tests
- `lib/__tests__/rate-limit.test.ts` - Rate limiting tests
- `docs/API.md` - Complete API documentation

### Phase 1
- `lib/constants.ts` - Centralized constants
- `lib/errors.ts` - Error handling utilities
- `lib/utils.ts` - Utility functions (sanitization, validation)
- `lib/rate-limit.ts` - Rate limiting implementation
- `lib/logger.ts` - Structured logging utility
- `lib/timeout.ts` - Timeout handling utilities

## Breaking Changes

None - all changes are backward compatible.

## Migration Notes

No migration required. All improvements are additive and don't change existing functionality.

