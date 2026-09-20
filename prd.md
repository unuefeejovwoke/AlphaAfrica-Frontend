# Alphaa Africa Travel Platform
## Product Requirements Document

### 1. Product overview

Alphaa Africa is an Abuja-based travel company serving customers who need practical help planning, booking, and managing travel. Its public-facing positioning covers flights, hotels, holiday packages, visa assistance, airport/travel support, and related travel services. Recent company activity also shows an emphasis on customer support and travel enquiries across phone, WhatsApp, email, and social channels.

The website must therefore function as more than a corporate brochure. It must be a **premium travel discovery, booking, and assisted-service platform**.

The core product promise is:

> **Make travel easier, clearer, and less stressful.**

A visitor should quickly understand that they can either:

- **Book something themselves**, such as a flight, hotel, or vehicle.
- **Get expert help**, such as with a holiday package or visa process.

The backend already supports flights, hotels, packages, car rentals, visa assistance, payments, accounts, and booking history.

---

# 2. Product objectives

## Primary objectives

1. Increase completed flight and hotel bookings.
2. Increase qualified package and visa enquiries.
3. Make Alphaa feel trustworthy enough for a visitor to submit personal and payment information.
4. Reduce friction for Nigerian users who may prefer WhatsApp or human assistance.
5. Make first-time and inexperienced travellers feel guided rather than overwhelmed.
6. Present Alphaa as a premium, modern travel company rather than a generic local travel agency.
7. Create a scalable customer experience that supports both retail travellers and business/corporate travellers.

## Secondary objectives

- Increase destination and package discovery.
- Increase account registration without forcing account creation before booking.
- Give returning customers access to booking history.
- Make customer support easy to reach at every important decision point.
- Improve organic discoverability of destinations, visa services, hotels, and packages.

---

# 3. Target customers

The experience must be designed around real travel intents rather than demographic categories alone.

## A. Leisure travellers

People booking vacations, honeymoons, weekend trips, family trips, or international holidays.

Primary need:
**“Show me where I can go and make the trip easy.”**

## B. First-time international travellers

Users who may not understand flights, visa processes, airports, documentation, or travel planning.

Primary need:
**“Guide me. I don't want to make an expensive mistake.”**

## C. Business travellers

People travelling for meetings, conferences, work, or professional commitments.

Primary need:
**“Get me where I need to be efficiently.”**

The API explicitly supports business as a travel purpose.

## D. Students and work travellers

People travelling for education or employment.

The visa flow explicitly supports study and work purposes.

## E. Families

Families travelling together, often with children and infants.

The flight system supports adults, children, and infants.

## F. Medical travellers

People travelling internationally for medical purposes.

The visa workflow supports medical travel as a purpose.

## G. High-intent customers who want human assistance

Customers who do not want to research everything themselves and prefer Alphaa to help organise the journey.

---

# 4. Positioning

The website should position Alphaa as:

**A trusted travel partner that combines modern self-service booking with real human assistance.**

Do not position the company as merely:

- a flight ticket seller
- a discount travel agency
- a directory of hotels
- a generic tourism website

The emotional positioning should be:

**“I can trust these people with my trip.”**

The practical positioning should be:

**“I can get what I need here without unnecessary stress.”**

---

# 5. Brand and visual direction

## Overall aesthetic

**Premium boutique travel agency.**

The website should feel like it was designed by a high-end digital design studio.

The visual language should be:

- sophisticated
- spacious
- editorial
- warm
- confident
- modern
- highly polished
- visually calm
- conversion-focused

Avoid:

- generic travel-agency layouts
- excessive cards
- overly rounded UI
- loud gradients
- excessive icons
- cheap-looking stock-photo compositions
- template-like dashboards
- unnecessary animation
- excessive purple/orange usage

## Brand colors

Existing logo colors:

**Orange:** `#FF6738`  
**Purple:** `#571563`

Recommended supporting palette:

**Primary background:** `#FAF9F7`  
Warm white rather than sterile pure white.

**Pure surface:** `#FFFFFF`

**Primary text:** `#171217`  
A near-black with a very subtle plum undertone.

**Secondary text:** `#6F6870`

**Borders:** `#E9E3E7`

**Primary brand action:** `#FF6738`

**Secondary brand/deep accent:** `#571563`

Use orange primarily for high-value calls to action and active states.

Use purple for depth, premium sections, large branded moments, selected states, and supporting visual hierarchy.

Do not use pure `#000000` for normal text and do not make the entire site orange/purple.

## Typography

Use a premium modern sans-serif with excellent readability.

Typography hierarchy should be strong enough that a visitor can scan the page in seconds.

Large headlines should be confident and editorial rather than overly futuristic.

---

# 6. Global UX principles

1. **Clarity before decoration.**
2. **One obvious primary action per section.**
3. **Never force account creation before a customer can begin booking.**
4. **Human assistance must always be close by.**
5. **Prices must be visually clear.**
6. **Do not hide important fees or booking conditions.**
7. **Use progressive disclosure for complicated forms.**
8. **Mobile experience is first-class, especially for Nigerian users.**
9. **Every loading state must explain what is happening.**
10. **Every failed action must explain how to recover.**
11. **Never leave the user wondering whether payment or booking succeeded.**

Guest booking is supported by the backend for flights, hotels, and cars, while registered customers can have profiles and order history. 
---

# 7. Primary navigation

Desktop navigation:

**Flights**  
**Hotels**  
**Packages**  
**Visa Assistance**  
**Car Rentals**  
**Destinations**

Secondary:

**About**  
**Contact**

Account:

**Log in**

Primary CTA:

**Book a Trip**

Mobile navigation should use a clean full-screen menu or highly polished sheet.

Persistent mobile support action:

**WhatsApp / Talk to Alphaa**

Because customer support is actively handled through WhatsApp, phone, email and social channels, support should not be buried in the footer.

---

# 8. Page architecture

## 8.1 Home

### Section 1: Hero

Headline focused on stress-free travel.

Example direction:

**Wherever you're going, we've got the journey covered.**

Supporting text should explain that users can book flights, hotels, cars, holiday packages, or get visa assistance.

Primary actions:

**Search flights**  
**Explore trips**

Secondary action:

**Talk to Alphaa**

Hero should include premium travel imagery with real human context.

### Section 2: Travel search switcher

Primary tabs:

- Flights
- Hotels
- Cars
- Packages

The default state should prioritize flights.

The search interface should feel like the product itself, not a generic form.

### Section 3: “How can we help?”

Five service tiles:

- Book a flight
- Find a hotel
- Plan a holiday
- Get visa help
- Rent a car

### Section 4: Featured destinations

Use API destination data.

Each card should show:

- image
- destination
- country
- number of packages
- starting price where available
- CTA

The destination API already supplies package count and starting price.

### Section 5: Featured holiday packages

Show curated packages from the API.

Card content:

- destination
- package title
- short summary
- duration
- starting price
- key inclusions
- image

### Section 6: Why Alphaa

Focus on outcomes:

**Less travel stress**  
**Real human support**  
**Clear booking process**  
**Travel options in one place**

Do not invent statistics.

### Section 7: Traveller scenarios

Use relatable mini-stories:

**Flying home to see family?**  
**Planning your honeymoon?**  
**Travelling for work?**  
**Studying abroad?**  
**Need help with a visa?**

Each should lead into the relevant service.

### Section 8: Trust section

Use only genuine company credentials, reviews, partner relationships, certifications, office information, or customer numbers supplied by Alphaa.

Do not fabricate testimonials or statistics.

### Section 9: Human assistance CTA

Large premium section:

**Not sure where to start?**

“Tell us where you're going and we'll help you figure out the rest.”

CTA:

**Talk to Alphaa**

### Section 10: Footer

Include:

- service links
- destinations
- account links
- contact
- WhatsApp
- office information
- legal links
- social links

---

# 8.2 Flights

## Section 1: Flight search

Fields:

- trip type
- origin
- destination
- departure
- return when applicable
- travellers
- cabin
- non-stop toggle
- maximum stops
- currency

Trip types:

- One way
- Round trip
- Multi-city

Multi-city must support 2–6 legs.

Origin/destination must use airport autocomplete rather than free-text-only entry.

Airport search supports IATA code, city, or airport name.

## Section 2: Search loading state

For domestic Nigerian flights, results may take approximately 30–60 seconds.

Do not display a blank spinner.

Show:

- search progress
- “Finding available flights…”
- progressive results when available
- explanation that airlines are being checked

The API explicitly recommends the streaming endpoint for the best UX.

## Section 3: Results

Every flight card should clearly show:

- airline
- departure
- arrival
- total duration
- stops
- airports
- cabin
- baggage information when available
- total price
- currency
- select button

Filters:

- price
- duration
- stops
- departure time
- airline
- cabin

Sort:

- recommended
- cheapest
- fastest
- earliest departure

## Section 4: Flight details

Show a clear journey timeline.

Do not overload the user with raw flight API information.

## Section 5: Price confirmation

Before booking, revalidate the selected offer.

The backend explicitly requires revalidation because flight prices can change between search and booking.

If price changed:

Show a transparent message:

**“The airline updated this fare.”**

Display:

- previous amount
- new amount
- difference
- continue/cancel action

---

# 8.3 Flight booking / checkout

## Section 1: Trip summary

Persistent summary on desktop.

## Section 2: Traveller information

For each traveller:

- first name
- last name
- date of birth
- gender
- email
- phone country code
- phone
- traveller type
- passport details where required by the booking flow

Backend traveller data includes these fields and supports adult, child, and held-infant traveller types. 
## Section 3: Contact information

- name
- email
- phone

## Section 4: Price summary

Display:

- fare
- Alphaa markup only as appropriate to business policy
- total
- currency

Do not expose internal pricing logic unless product/business explicitly wants it.

The API applies Alphaa markup to flight offers before returning final customer-facing prices.

## Section 5: Payment

Use backend-provided payment authorization flow.

Do not collect or store card information in the application.

## Section 6: Booking state

States:

- preparing booking
- redirecting to payment
- payment processing
- confirming booking
- confirmed
- failed
- cancelled

The actual airline order/PNR is created only after successful payment.

---

# 8.4 Booking confirmation

Show a premium success screen.

Display:

- success state
- booking reference
- PNR when available
- traveller information summary
- route
- dates
- amount
- payment state
- next steps

Actions:

**View booking**  
**Download/share confirmation**  
**Contact Alphaa**

The universal payment order endpoint can return booking information by payment reference.

---

# 8.5 Hotels

## Section 1: Search

Fields:

- destination/hotel
- check-in
- check-out
- guests
- rooms

Filters:

- price
- star rating
- amenities
- location where available

The API supports destination, dates, guests, rooms, star rating, and maximum price filtering.

## Section 2: Results

Cards:

- image
- hotel name
- city/country
- star rating
- key amenities
- starting price
- CTA

## Section 3: Hotel details

Sections:

- gallery
- overview
- location
- amenities
- room types
- pricing
- booking panel

Hotel detail data includes gallery images, amenities, coordinates, room types, and starting price.

## Section 4: Booking

Fields:

- room
- dates
- rooms
- guests
- guest name
- email
- phone

Guest booking must be supported.

---

# 8.6 Holiday Packages

## Packages listing

Sections:

1. Hero
2. Featured packages
3. Destination filter
4. Price filter
5. Package grid
6. CTA for custom trip planning

Package cards should show:

- title
- destination
- duration
- starting price
- inclusions
- image

The API explicitly exposes these fields.

## Package detail

Sections:

1. Hero image
2. Package name
3. Destination
4. Duration
5. Starting price per person
6. Highlights
7. What's included
8. Gallery
9. Description
10. Enquiry form
11. “Need something different?” CTA

The package flow is **enquiry-first, not payment-first**. The backend creates an enquiry and the travel team follows up.

---

# 8.7 Visa Assistance

## Visa listing

Hero:

**Planning to travel? Get help with the visa process.**

Country grid/list:

- flag
- country
- consultation fee
- processing time
- featured state

## Visa country detail

Sections:

1. Country hero
2. Visa assistance overview
3. Consultation fee
4. Processing time
5. Who this service is for
6. What Alphaa helps with
7. Application/consultation CTA
8. FAQ
9. Human support CTA

The API provides country-specific consultation fees, processing time and descriptions.

## Visa application form

Fields:

- country
- full name
- email
- phone
- travel purpose
- preferred date
- number of applicants
- message

Travel purpose options:

- Tourism
- Business
- Study
- Work
- Medical
- Family Visit
- Other

These values are explicitly defined by the API.

The consultation payment should occur through the backend payment flow.

---

# 8.8 Car Rentals

## Listing

Hero + filters.

Vehicle cards:

- image
- vehicle name
- type
- passenger capacity
- city
- hourly rate
- CTA

Supported vehicle categories include executive/normal sedans, executive/normal SUVs, Coasters and other vehicles.

## Vehicle detail

Sections:

- hero/image
- description
- vehicle type
- capacity
- hourly rate
- booking CTA

## Booking

Fields:

- pickup location
- drop-off location
- pickup date/time
- number of hours
- guest name
- guest email
- guest phone

The backend calculates total using the hourly rate multiplied by booked hours.

---

# 8.9 Destinations

## Destination listing

Use destination imagery with:

- destination
- country
- number of available packages
- starting price

## Destination detail

Sections:

1. Hero
2. Destination introduction
3. Featured packages
4. Other packages
5. Travel inspiration
6. CTA

Destination detail returns the destination and its active packages.

---

# 8.10 About Alphaa

Sections:

1. Hero
2. Who Alphaa is
3. What the company helps customers do
4. Services
5. Why customers choose Alphaa
6. Human support philosophy
7. Abuja office / contact information
8. CTA

Do not make this page an essay.

The page should establish trust quickly.

---

# 8.11 Contact

Sections:

1. Hero
2. Contact options
3. WhatsApp
4. Phone
5. Email
6. Office location
7. Contact form
8. FAQ
9. Emergency/support guidance where appropriate

Support should be framed as accessible and human, consistent with Alphaa's public customer-support activity.

---

# 8.12 FAQ

Organize FAQs into:

- Flights
- Hotels
- Packages
- Visa assistance
- Car rentals
- Payments
- Booking changes
- Cancellation/refunds
- Account
- General travel

Only publish answers verified by Alphaa operations.

---

# 9. Authentication and account experience

Authentication must be helpful, not obstructive.

Pages:

- Login
- Register
- Verify email
- Forgot password
- Reset password
- Profile
- Booking history

Backend supports registration, login, JWT refresh, email verification, password reset, profile updates, and password changes. 
## Account rules

- Users can browse publicly.
- Users can start bookings without registering where supported.
- Account creation should be encouraged after successful booking, not forced before search.
- Verified email should be required before enabling account-only actions.
- Booking history should be accessible to logged-in users.
- Guest order retrieval must work using the secure email/token mechanism provided by the backend.

## Security requirements

- Never expose refresh tokens unnecessarily to browser JavaScript.
- Centralize authentication state.
- Automatically handle access-token expiry/refresh.
- Clear credentials on logout.
- Never put sensitive authentication state in URLs.
- Never store passwords.
- Do not log access tokens, refresh tokens, passport data, or payment information.
- Sanitize all user-generated text before rendering.
- Treat API responses as untrusted input.
- Enforce server-side validation even when client validation passes.
- Prevent duplicate booking submissions.
- Disable payment/submit actions while a transaction is being created.
- Maintain clear session expiry behavior.
- Handle unauthorized, forbidden, expired, and invalid-token responses consistently.

---

# 10. Form validation requirements

All forms require both client-side and backend validation.

## General

Required fields must be visually obvious.

Validation should happen:

- on blur for individual fields
- on submit for the entire form
- before payment/booking creation

Error messages must be human-readable.

Do not display raw backend errors to customers.

Map technical API errors into useful messages.

## Email

Validate proper email format.

## Phone

Accept Nigerian formats and valid international formats.

Normalize numbers before submission where possible.

Do not unnecessarily reject legitimate Nigerian mobile-number formats.

## Dates

- Do not allow impossible dates.
- Do not allow past travel dates.
- Round-trip return cannot precede departure.
- Hotel checkout must be after check-in.
- Preferred dates must not be in the past unless the business explicitly permits historical enquiries.

## Counters

Never allow:

- zero adults on a flight search
- negative guests
- negative rooms
- negative children
- negative infants
- zero applicants
- zero booking hours

Mirror backend constraints exactly.

---

# 11. API integration requirements

Create a single clean API integration layer.

Components/pages must not contain scattered HTTP logic.

The integration layer must cover:

### Authentication

- login
- register
- refresh token
- verify email
- password reset
- profile
- change password

### Flights

- airport autocomplete
- international/general flight search
- domestic flight search
- domestic streaming search
- price confirmation
- booking creation
- booking verification

Relevant backend endpoints include `/api/flights/search/`, `/api/flights/local-search/`, `/api/flights/local-search-stream/`, `/api/flights/price/`, `/api/flights/bookings/create/`, and `/api/flights/bookings/verify/{reference}/`.

### Hotels

- hotel search
- hotel detail
- booking creation
- booking verification

### Packages

- package list
- package detail
- destination list
- destination detail
- package enquiry

### Visa

- countries
- country detail
- visa application
- payment verification

### Cars

- vehicle list
- vehicle detail
- booking
- payment verification

### Orders

- payment order lookup
- order history

The API provides these endpoint groups directly.

---

# 12. API state handling

Every API-backed page must explicitly support:

- idle
- loading
- success
- empty
- error
- retry

Do not show empty containers when data has not loaded.

For slow domestic flight searches, show progressive streamed results rather than forcing users to stare at a generic loading spinner.

Use skeleton loading states where appropriate.

---

# 13. Payment flow

Payment is handled by the backend payment provider integration.

The frontend must:

1. validate the form
2. create a pending booking/application
3. receive payment authorization URL and reference
4. redirect to payment
5. return to the confirmation route
6. verify payment/reference
7. fetch the final order
8. display the final status

Never assume that returning from payment means the booking succeeded.

The backend uses Paystack authorization URLs and verification for booking/payment workflows. 
---

# 14. Conversion system

The website should continuously answer:

**What are you trying to do?**

Primary CTAs:

**Search flights**  
**Find a hotel**  
**Explore packages**  
**Get visa help**  
**Rent a car**  
**Talk to Alphaa**

Secondary CTAs should never compete visually with the primary action.

Every service page must end with a clear next action.

Every major booking/search page must provide a support escape hatch.

Example:

**Need help choosing? Talk to Alphaa**

This is especially important for less experienced travellers.

---

# 15. Mobile experience

Mobile is a critical channel.

Requirements:

- thumb-friendly controls
- large tap targets
- sticky primary actions where useful
- bottom-sheet filters
- compressed but readable results
- easy WhatsApp access
- minimal typing
- numeric controls for traveller counts
- date pickers optimized for mobile
- sticky booking summaries where appropriate

Do not simply shrink desktop layouts.

---

# 16. Performance and perceived speed

The experience should feel fast even when APIs are slow.

Requirements:

- optimized image loading
- lazy loading below-the-fold imagery
- skeletons
- streaming where supported
- optimistic UI only when safe
- no blocking decorative animations
- preserve search state during navigation
- avoid unnecessary API calls
- cache stable content such as destinations/packages where appropriate

For live flight searches, perceived responsiveness is particularly important because backend search may take 30–60 seconds.

---

# 17. Accessibility

Required:

- keyboard navigation
- visible focus states
- proper labels
- accessible form errors
- accessible modals/dialogs
- proper button semantics
- sufficient contrast
- screen-reader-friendly loading states
- no interaction dependent solely on hover
- accessible date and traveller selectors

---

# 18. SEO/content structure

Public indexable pages should include:

- unique page title
- unique meta description
- canonical URL
- meaningful heading hierarchy
- descriptive image alt text
- Open Graph data
- structured data where appropriate
- crawlable internal links

High-value SEO pages:

- destinations
- destination details
- holiday packages
- package details
- visa assistance
- visa country pages
- hotels
- hotel detail pages

Avoid creating thin pages with little useful content.

---

# 19. Content tone

Voice:

**Warm. Confident. Human. Clear.**

Do not use exaggerated luxury/travel clichés such as:

- “Embark on an unforgettable journey”
- “Your gateway to paradise”
- “Travel like never before”

Prefer practical, relatable language:

**Planning your first international trip? We can help.**

**Need a flight without the hassle? Search available options.**

**Not sure what visa support you need? Start with a consultation.**

The customer should feel understood, not marketed at.

---

# 20. Error and recovery UX

Every failure state must answer:

1. What happened?
2. Is my booking/payment safe?
3. What should I do next?

Examples:

### Search failure

**We couldn't find flights right now.**

Try another route/date or speak with Alphaa.

### Payment return

**We're confirming your payment.**

Do not close this page yet.

### Booking failure

**Your booking wasn't completed.**

If payment was deducted, display a reassurance message instructing the customer to contact support and/or check order status.

Never tell a customer simply:

**“Something went wrong.”**

---

# 21. Development phases

## Phase 1 — Foundation and design system

Build:

- global layout
- navigation
- footer
- typography system
- colors
- spacing
- buttons
- form controls
- cards
- dialogs
- drawers
- loading states
- error states
- toast/notification patterns
- support CTA

Acceptance criteria:

The core visual system feels premium and consistent before service-specific pages are built.

---

## Phase 2 — Public marketing experience

Build:

- Home
- About
- Contact
- FAQ
- Destinations
- Destination detail
- Packages
- Package detail
- Visa assistance
- Visa country detail

Connect these pages to API content.

Acceptance criteria:

A visitor can discover Alphaa, understand its services, browse destinations/packages/visa offerings, and submit an enquiry/application.

---

## Phase 3 — Flights

Build:

- Flight search
- airport autocomplete
- search results
- filters/sorting
- domestic streaming results
- price confirmation
- traveller forms
- checkout
- Paystack flow
- confirmation
- failure/recovery states

Acceptance criteria:

A guest can successfully search, select, confirm price, pay, and receive a verified booking/PNR where successful.

---

## Phase 4 — Hotels

Build:

- hotel search
- filters
- result cards
- hotel detail
- room selection
- booking
- payment
- confirmation

Acceptance criteria:

A guest can search and complete a hotel booking without creating an account.

---

## Phase 5 — Car rentals

Build:

- vehicle listing
- filters
- vehicle details
- booking form
- payment
- confirmation

Acceptance criteria:

A guest can book a vehicle by selecting pickup/drop-off details and duration.

---

## Phase 6 — Authentication and account

Build:

- registration
- email verification
- login
- logout
- password reset
- profile
- order history

Add account prompts after successful guest transactions rather than before.

Acceptance criteria:

Authentication remains secure and does not interfere with guest booking.

---

## Phase 7 — Conversion and trust refinement

Add:

- contextual CTAs
- support prompts
- trust content
- testimonials only when supplied
- social proof
- richer destination discovery
- booking reassurance
- FAQ refinement
- WhatsApp entry points
- improved copy

Acceptance criteria:

Every major page has an intentional conversion path.

---

## Phase 8 — Production hardening

Verify:

- responsive behavior
- accessibility
- SEO
- validation
- API error handling
- payment recovery
- authentication security
- loading states
- empty states
- duplicate submission prevention
- broken routes
- image performance
- analytics/event tracking

---

# 22. Analytics events

Track at minimum:

- homepage CTA click
- flight search started
- flight search completed
- flight selected
- flight price changed
- flight checkout started
- payment initiated
- payment completed
- hotel search
- hotel viewed
- hotel booking started
- package viewed
- package enquiry submitted
- visa country viewed
- visa application started
- visa payment initiated
- visa payment completed
- car viewed
- car booking started
- support/WhatsApp click
- account registration
- login
- booking confirmation viewed

Do not capture sensitive passport, payment, password, or authentication-token data in analytics.

---

# 23. Definition of done

The product is considered complete when:

- all primary service journeys work end-to-end
- all API integrations are centralized and reliable
- forms validate correctly
- booking/payment states are unambiguous
- guest bookings work where supported
- authentication works securely
- responsive behavior is polished
- loading/error/empty states are implemented
- every public page has a clear purpose and CTA
- the site feels like a premium travel brand rather than a template
- the site speaks naturally to Nigerian travellers while remaining internationally credible
- no fabricated reviews, numbers, partnerships, certifications, or claims appear
- the experience consistently answers the visitor's question:

**“Can Alphaa help me with this trip?”**

The intended answer throughout the product should be immediately obvious:

**Yes. Start here.**