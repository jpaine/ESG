# ESG Automation API Documentation

## Overview

The ESG Automation API provides endpoints for processing company documents, extracting information, and generating ESG assessments and investment memos.

**Base URL**: `/api`

All API endpoints return JSON responses and use standard HTTP status codes.

## Authentication

No authentication required. Rate limiting is applied per IP address.

## Rate Limiting

- **Per Minute**: 10 requests
- **Per Hour**: 100 requests

When rate limit is exceeded, the API returns:
- **Status Code**: `429 Too Many Requests`
- **Headers**: `Retry-After: 60`
- **Response**: 
  ```json
  {
    "error": "Rate limit exceeded: 10 requests per minute. Please try again in X seconds.",
    "code": "RATE_LIMIT_EXCEEDED",
    "requestId": "req-..."
  }
  ```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "req-timestamp-random",
  "details": { /* optional additional details */ }
}
```

### Error Codes

- `VALIDATION_ERROR` (400) - Invalid input data
- `AUTHENTICATION_ERROR` (401) - API key not configured
- `NOT_FOUND` (404) - Resource not found
- `RATE_LIMIT_EXCEEDED` (429) - Rate limit exceeded
- `FILE_PROCESSING_ERROR` (422) - File processing failed
- `LLM_ERROR` (500) - LLM API error
- `TIMEOUT_ERROR` (504) - Request timeout
- `INTERNAL_ERROR` (500) - Internal server error

## Endpoints

### 1. Upload File

Upload and extract text from company documents (PDF, Word, or text files).

**Endpoint**: `POST /api/upload`

**Content-Type**: `multipart/form-data`

**Request**:
- `file` (File, required): PDF, Word (.docx), or text (.txt) file
  - Maximum size: 4.5MB
  - Supported formats: `.pdf`, `.docx`, `.txt`

**Response** (200 OK):
```json
{
  "text": "Extracted text content...",
  "metadata": {
    "title": "filename.pdf",
    "pages": 10
  },
  "fileName": "sanitized_filename.pdf",
  "requestId": "upload-timestamp-random"
}
```

**Error Responses**:
- `400` - No file provided
- `413` - File size exceeds 4.5MB
- `422` - No text could be extracted from file
- `500` - File processing failed

**Example**:
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@document.pdf"
```

---

### 2. Extract Company Information

Extract structured company information from text using AI.

**Endpoint**: `POST /api/extract-info`

**Content-Type**: `application/json`

**Request**:
```json
{
  "text": "Company information text..."
}
```

**Response** (200 OK):
```json
{
  "companyName": "FDcare",
  "sector": "Healthcare",
  "subSector": "Primary Care and Homecare Services",
  "countriesOfOperation": ["Vietnam", "Singapore"],
  "numberOfEmployees": "<30",
  "businessActivities": "Detailed description of business activities...",
  "productDescription": "Detailed product/service description...",
  "currentESGPractices": "Optional ESG practices...",
  "policies": "Optional policies...",
  "complianceStatus": "Optional compliance status...",
  "requestId": "extract-timestamp-random"
}
```

**Error Responses**:
- `400` - No text provided or text is empty
- `422` - Could not extract complete company information
- `500` - LLM API error or timeout

**Example**:
```bash
curl -X POST http://localhost:3000/api/extract-info \
  -H "Content-Type: application/json" \
  -d '{"text": "Company information..."}'
```

---

### 3. Generate DDQ

Generate ESG Due Diligence Questionnaire assessment.

**Endpoint**: `POST /api/generate-ddq`

**Content-Type**: `application/json`

**Request**:
```json
{
  "companyInfo": {
    "companyName": "FDcare",
    "sector": "Healthcare",
    "subSector": "Primary Care and Homecare Services",
    "countriesOfOperation": ["Vietnam"],
    "numberOfEmployees": "<30",
    "businessActivities": "Detailed business activities...",
    "productDescription": "Detailed product description...",
    "currentESGPractices": "Optional",
    "policies": "Optional",
    "complianceStatus": "Optional"
  },
  "extractedText": "Optional additional text from documents..."
}
```

**Response** (200 OK):
```json
{
  "riskManagement": [
    {
      "area": "ESG Policy",
      "definition": "Brief definition",
      "materiality": "High",
      "level": "Level 0",
      "comments": "Detailed assessment comments..."
    }
  ],
  "environment": [...],
  "social": [...],
  "governance": [...],
  "trackRecord": {
    "regulatoryBreaches": "None",
    "supplyChainIssues": "None",
    "transparencyDisclosure": "None",
    "renewableEnergy": "N/A"
  },
  "requestId": "ddq-timestamp-random"
}
```

**Processing Time**: Typically 30-60 seconds

**Error Responses**:
- `400` - Company information is required
- `500` - LLM API error or timeout

**Example**:
```bash
curl -X POST http://localhost:3000/api/generate-ddq \
  -H "Content-Type: application/json" \
  -d '{"companyInfo": {...}, "extractedText": "..."}'
```

---

### 4. Generate Investment Memo

Generate Investment Memo based on DDQ results.

**Endpoint**: `POST /api/generate-im`

**Content-Type**: `application/json`

**Request**:
```json
{
  "companyInfo": { /* CompanyInfo object */ },
  "ddqResult": { /* DDQResult object */ },
  "extractedText": "Optional additional text..."
}
```

**Response** (200 OK):
```json
{
  "companyName": "FDcare",
  "productActivitySolution": "Description...",
  "riskCategory": "Category C",
  "grievanceRedressMechanism": "GRM details...",
  "sector": "Healthcare",
  "subSector": "Primary Care and Homecare Services",
  "countriesOfOperation": "Vietnam",
  "numberOfEmployees": "<30",
  "currentRisks": ["Risk 1", "Risk 2"],
  "currentOpportunities": ["Opportunity 1"],
  "longTermRisks": ["Long-term risk 1"],
  "longTermOpportunities": ["Long-term opportunity 1"],
  "foundersCommitment": "Commitment details...",
  "stakeholderConsultations": "Consultation details...",
  "potentialGrievances": "Grievance details...",
  "riskOfRetaliation": "Retaliation risk details...",
  "gaps": ["Gap 1", "Gap 2"],
  "actionPlan": ["Action 1", "Action 2"],
  "estimatedCost": "Cost estimate...",
  "timeframe": "Timeframe...",
  "limitations": ["Limitation 1"],
  "requestId": "im-timestamp-random"
}
```

**Processing Time**: Typically 30-60 seconds

**Error Responses**:
- `400` - Company information and DDQ results are required
- `500` - LLM API error or timeout

---

### 5. Download DDQ Document

Download DDQ assessment as Word document.

**Endpoint**: `POST /api/download-ddq`

**Content-Type**: `application/json`

**Request**:
```json
{
  "ddqResult": { /* DDQResult object */ }
}
```

**Response** (200 OK):
- **Content-Type**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Content-Disposition**: `attachment; filename="ESG_DDQ.docx"`
- **Body**: Word document binary data

**Error Responses**:
- `400` - DDQ result is required
- `500` - Document generation failed

---

### 6. Download Investment Memo Document

Download Investment Memo as Word document.

**Endpoint**: `POST /api/download-im`

**Content-Type**: `application/json`

**Request**:
```json
{
  "imResult": { /* IMResult object */ }
}
```

**Response** (200 OK):
- **Content-Type**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Content-Disposition**: `attachment; filename="ESG_Investment_Memo.docx"`
- **Body**: Word document binary data

**Error Responses**:
- `400` - IM result is required
- `500` - Document generation failed

---

## Request IDs

All API responses include a `requestId` field for tracking and debugging:
- Format: `{prefix}-{timestamp}-{random}`
- Example: `upload-1701234567890-abc123xyz`
- Use this ID when reporting issues or checking logs

## Timeouts

- **File Upload**: 2 minutes
- **Company Info Extraction**: 5 minutes
- **DDQ Generation**: 5 minutes
- **IM Generation**: 5 minutes

If a request times out, you'll receive a `504 Timeout Error` with details.

## Environment Variables

The following environment variables must be set:

- `OPENAI_API_KEY` (required) - OpenAI API key for LLM operations
- `GEMINI_API_KEY` (required) - Google Gemini API key for PDF processing
- `ANTHROPIC_API_KEY` (optional) - Anthropic API key as alternative to OpenAI

Optional model configuration:
- `OPENAI_MODEL` - Default: `gpt-4-turbo-preview`
- `ANTHROPIC_MODEL` - Default: `claude-3-5-sonnet-20241022`
- `GEMINI_MODEL` - Default: `gemini-2.5-flash`

## Best Practices

1. **File Upload**: Keep files under 4.5MB. For larger documents, split into multiple files or compress.
2. **Error Handling**: Always check the `error` field in responses and handle errors gracefully.
3. **Rate Limiting**: Implement exponential backoff when hitting rate limits.
4. **Timeouts**: DDQ and IM generation can take 30-60 seconds. Implement proper timeout handling on the client side.
5. **Request IDs**: Log request IDs for debugging and support requests.

## Example Workflow

```javascript
// 1. Upload file
const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
const { text, requestId: uploadId } = await uploadResponse.json();

// 2. Extract company info
const extractResponse = await fetch('/api/extract-info', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text })
});
const companyInfo = await extractResponse.json();

// 3. Generate DDQ
const ddqResponse = await fetch('/api/generate-ddq', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ companyInfo, extractedText: text })
});
const ddqResult = await ddqResponse.json();

// 4. Generate IM
const imResponse = await fetch('/api/generate-im', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ companyInfo, ddqResult, extractedText: text })
});
const imResult = await imResponse.json();

// 5. Download documents
const ddqDoc = await fetch('/api/download-ddq', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ddqResult })
});
const ddqBlob = await ddqDoc.blob();
// Save blob as file...
```

