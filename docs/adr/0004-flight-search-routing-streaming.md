# Flight Search Routing and Domestic Streaming

Domestic searches (both airports Nigerian) route to QuickAir via a Next.js Route Handler proxy (`force-dynamic`, `no-store`) that pipes SSE verbatim with `fetch` reader + `AbortController` and falls back to blocking `local-search` on error; all other searches use Amadeus `POST /search/` with auto-detected trip type. No manual Domestic/International toggle and NGN-only currency in v1 to protect first-time travellers from choice overload.

Considered Options: explicit Domestic/International toggle; direct browser EventSource to backend; blocking-only domestic search.
Consequences: requires a canonical NG-airport list for detection; SSE proxy must never be ISR-cached; client filters/sorts accumulated cards live with search state in URL searchParams.
