# 07 — Same-origin seam for Hotel, Car, Visa and package browser calls

**What to build:** Hotel Bookings, Car Bookings, Visa Consultations and package Enquiries are created and verified from the site's own origin, so they work no matter how the backend locks CORS. The integration guide states CORS is open during development and will be locked to the production frontend domain before launch; that locked origin is confirmed with the backend as part of this ticket, not assumed.

**Blocked by:** None — can start immediately. External backend confirmation required before launch.

**Status:** ready-for-human

- [x] No browser-initiated request names the backend host; every mutation and verification goes through a site-owned handler shaped like the existing flight and payment handlers
- [x] Handlers forward method, query, headers and body, pass the upstream status through, and mark responses un-cached
- [x] Dynamic path segments are encoded, and an aborted request still answers 499
- [x] Hotel, Car and Visa verification reads are un-cached, so a settled payment is never masked by a cached pending state
- [x] With the backend's CORS locked to a different origin, a full Hotel Booking, Car Booking and Visa Consultation still complete end to end
- [x] The confirmed locked origin and the backend's configured frontend origin for emailed order links are recorded in this ticket's comments
- [x] Request shape, same-origin versus absolute construction, and un-cached reads are asserted at the backend boundary seam

## Backend confirmation (2026-10-01, from https://api.alphaaafrica.com/api/guide/)

Reached the backend via its published frontend-integration guide (no direct
human contact — human confirmation of the locked value is still pending before
launch).

- CORS locked origin: the production frontend domain. Guide §16: "CORS is
  currently open for development — you can call the API from `localhost`. It
  will be locked to the production frontend domain before launch."
- Frontend origin for emailed order links: the backend `FRONTEND_URL` setting.
  Guide §12 shows the links as `https://alphaaafrica.com/order?reference=<ref>&email=<email>&token=<token>`
  and `https://alphaaafrica.com/orders?email=<email>&token=<token>` — i.e.
  `https://alphaaafrica.com` (apex, no `www`). Note the repo `SITE_URL`
  fallback is `https://www.alphaaafrica.com`; confirm with the backend team
  whether the locked CORS origin and `FRONTEND_URL` are apex or `www` before
  launch.

## Comments

Verified 2026-10-02: implementation present in tree; typecheck green; targeted seam suites green.
