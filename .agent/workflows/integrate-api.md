---
description: How to integrate external APIs (Data, News, etc.)
---

# API Integration & Resilience Workflow

This workflow ensures all external data sources in CoinBob are robust, rate-limited, and work offline.

## 1. Interface Definition
- [ ] Define the shape of the data in `types/`.
- [ ] **Strict Typing**: Avoid `any`. Map API responses to internal clean types.

## 2. Service Layer (`lib/services/`)
- [ ] **Fetch Function**: Create a function to fetch from the API.
- [ ] **Rate Limiting**: Implement handling for `429` errors.
  - If limit reached -> Automatic fallback to Mock Data.
- [ ] **Error Handling**: `try/catch` every external call.
- [ ] **Caching**: Use simple in-memory variables or `localStorage` with timestamps to prevent refetching too often (e.g., "stale-while-revalidate").

## 3. Mock Data Strategy (Mandatory)
- [ ] Create a `MOCK_[DATA_TYPE]` constant in the service file.
- [ ] **Fallback Logic**:
```typescript
try {
  if (useMock || !apiKey) return MOCK_DATA;
  const res = await fetch(...);
  return res.ok ? res.json() : MOCK_DATA;
} catch (e) {
  console.error(e);
  return MOCK_DATA; // Always return data, never crash
}
```

## 4. UI Integration
- [ ] Use a custom hook (e.g., `useCryptoNews`) to consume the service.
- [ ] **Loading States**: Show skeletons or spinners while data fetches.
- [ ] **Error States**: Display a subtle toast or message if using cached/mock data due to error (optional, but good UX).

## 5. Verification
- [ ] **Happy Path**: Test with valid API key.
- [ ] **No Key**: Remove API key from env and verify app loads with Mock Data.
- [ ] **Offline**: Disable network and verify app doesn't crash.
