# Environment Variables Reference

## Required Variables

These must be set in Vercel for the application to work:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for GPT-4 (required for LLM operations) |
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key for PDF OCR and processing |

## Optional Variables

### LLM Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | Anthropic API key (alternative to OpenAI) |
| `OPENAI_MODEL` | `gpt-4-turbo-preview` | OpenAI model to use |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-20241022` | Anthropic model to use |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model to use |

### Feature Flags

All feature flags default to enabled/true unless explicitly set to `false`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_WEB_SEARCH` | `true` | Enable web search for company information (set to `false` to disable) |
| `ENABLE_PROGRESS_INDICATORS` | `true` | Show progress bars during generation (set to `false` to disable) |
| `ENABLE_METRICS` | `true` | Collect metrics and analytics (set to `false` to disable) |
| `ENABLE_RATE_LIMITING` | `true` | Apply rate limiting to API routes (set to `false` to disable) |
| `ENABLE_DATA_PERSISTENCE` | `false` | Enable client-side localStorage persistence (set to `true` to enable) |
| `LLM_PROVIDER` | `auto` | LLM provider: `openai`, `anthropic`, or `auto` (auto-selects based on available keys) |
| `MAX_RETRY_ATTEMPTS` | `3` | Maximum retry attempts for LLM API calls |

### Custom Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BASE_URL` | - | Custom base URL for the application (used for RMF file loading) |

## Vercel Auto-Set Variables

These are automatically set by Vercel (don't set manually):

- `VERCEL_URL` - Current deployment URL
- `VERCEL` - Set to `1` in Vercel environment
- `NODE_ENV` - Set to `production` in production

## Setting Variables in Vercel

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `OPENAI_API_KEY`)
   - **Value**: Your API key or value
   - **Environment**: Select which environments (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your project for changes to take effect

## Minimum Required Setup

For basic functionality, you only need:
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

All other variables are optional and will use sensible defaults.

## Recommended Production Setup

For production, consider:
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...  # Optional: for fallback
ENABLE_METRICS=true
ENABLE_RATE_LIMITING=true
LLM_PROVIDER=auto
```

