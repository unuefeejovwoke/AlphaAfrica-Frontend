Status: ready-for-agent

# Specification: Phase 1 — Foundation and Design System

## Problem Statement

Travel planning and booking across flights, hotels, holiday packages, and international visas is stressful and high-stakes, especially for Nigerian and African travellers navigating complex requirements, fluctuating costs, and unfamiliar checkout processes.

Currently, the Alphaa Africa web platform lacks the unified visual identity, layout shells, accessible form primitives, and reassuring feedback mechanisms needed to project trust, competence, and modern luxury. Without a solid, coherent design system and accessible component foundation, upcoming travel booking workflows and assisted-service flows risk appearing fragmented, confusing, and inconsistent.

## Solution

Establish a robust, accessible, and premium foundation and design system adhering to the Alphaa Africa boutique agency identity:
1. An editorial visual hierarchy utilizing warm off-white surfaces (`#FAF9F7`), deep plum text (`#171217`), brand orange actions (`#FF6738`), and deep plum accents (`#571563`).
2. Separate App Router layout boundaries isolating public marketing discovery from distraction-free transactional checkout.
3. Responsive navigation and comprehensive editorial footer displaying services, Abuja headquarters contact details, trust badges, and payment reassurance.
4. A persistent floating Assisted Service support CTA widget with a multi-channel drawer providing one-tap WhatsApp routing, direct phone calling, and quick consultation requests.
5. Standardized accessible form controls, inputs, steppers, date pickers, cards, dialogs, and sheets built upon headless Base UI primitives and validated via React Hook Form and Zod schemas.
6. Empathetic, travel-aware loading and error feedback states that explain what is happening behind the scenes and ensure customers are never left stranded with a generic error message.

## User Stories

1. As a leisure traveller exploring the platform on desktop, I want an uncluttered, premium navigation bar listing all core services (Flights, Hotels, Packages, Visa Assistance, Car Rentals, Destinations), so that I can immediately discover what Alphaa Africa offers.
2. As a first-time international traveller, I want to see a prominent "Book a Trip" primary call-to-action in the navigation, so that I have a clear starting point for my journey.
3. As a mobile visitor, I want a smooth, responsive navigation drawer with clear typography and large touch targets, so that I can easily navigate between services on my smartphone.
4. As a customer who prefers speaking with a human specialist, I want a persistent floating support trigger visible on every public page, so that expert help is always within one tap.
5. As a customer clicking the support widget, I want an assisted-service drawer presenting direct WhatsApp chat, telephone dialling, and consultation request options, so that I can choose my preferred communication channel.
6. As a WhatsApp user, I want the WhatsApp support link to pre-populate relevant context about the current page or service I was browsing, so that the agent immediately understands what I need assistance with.
7. As a corporate traveller browsing destinations and services, I want to read clear, confident editorial typography without distracting decorative fonts, so that I can quickly scan travel options.
8. As a customer scrolling to the bottom of any page, I want an informative footer showing service directories, official Abuja office address, emergency contact numbers, and social channels, so that I can verify Alphaa Africa is an established, trustworthy physical business.
9. As a customer preparing to enter payment details, I want to see recognized security badges and payment partner reassurance in the layout, so that I feel safe completing transactions.
10. As a visitor in bright daylight or low light, I want harmonious color contrast between text, surfaces, and action buttons, so that all content is effortlessly readable.
11. As a traveller searching for flights or hotels, I want form fields with clear visual labels, helper text, and accessible focus outlines, so that I can enter dates and locations without confusion.
12. As a family organizer booking a trip with children and infants, I want an intuitive passenger stepper control for adults, children, and infants, so that I can configure the exact composition of travellers accurately.
13. As a traveller entering passenger details, I want immediate, human-readable inline validation errors when a required field or date format is invalid, so that I can correct errors before submitting.
14. As a customer completing a form with invalid data, I want focus to move to the first invalid control and display a descriptive message, so that I know exactly what needs fixing.
15. As a customer submitting an enquiry or booking request, I want action buttons to display a clean loading indicator and disable double-clicking, so that I do not duplicate submissions or payments.
16. As a guest customer awaiting flight or hotel search results, I want a loading state with progress feedback and explanatory copy describing what the system is checking, so that I know the system is actively working.
17. As a customer encountering a search timeout or service failure, I want an error state that explicitly explains the issue and provides actionable recovery options (e.g. adjust dates, retry, or contact Alphaa on WhatsApp), so that I am never stranded with a vague failure notice.
18. As a customer performing an action like saving a preference or requesting a call, I want non-intrusive toast notifications that confirm success or flag warnings with an option to dismiss, so that I receive immediate feedback.
19. As a keyboard or screen-reader user, I want all modals, dialogs, and drawer sheets to trap focus correctly and support escape-key dismissal, so that the application is fully accessible.
20. As a customer transitioning into the booking checkout funnel, I want to enter a focused, distraction-free checkout layout without external marketing navigation links, so that I can concentrate on completing my reservation securely.

## Implementation Decisions

- **Color System and Styling Architecture**:
  - The design system will configure the Alphaa brand palette directly into semantic tokens:
    - Primary Action: Warm Orange (`#FF6738`)
    - Secondary & Deep Accent: Plum (`#571563`)
    - Background: Warm Off-White (`#FAF9F7`)
    - Primary Text: Near-black Plum (`#171217`)
    - Secondary Text: Muted Plum Slate (`#6F6870`)
    - Borders: Subtle Warm Gray (`#E9E3E7`)
  - Configured directly in the global CSS theme with inline token mappings so standard components inherit the brand palette by default.

- **Typography System**:
  - Unified modern sans-serif hierarchy applied across both heading and body elements to maintain consistent legibility, rapid scannability, and an editorial aesthetic.

- **Layout Structure & Route Boundaries**:
  - Separation into two distinct layout shells using Next.js route groups:
    - `(public)` layout: Houses the global navigation bar with service links, login trigger, mobile drawer, the persistent floating support widget, and the editorial brand footer.
    - `(checkout)` layout: Houses a streamlined, distraction-free header displaying the Alphaa emblem, progress indicator, security reassurance cue, and a direct emergency support link.

- **UI Primitives and Component Library**:
  - Standardized on headless Base UI React primitives styled with Tailwind CSS utility classes:
    - Button: Primary, Secondary, Outline, Ghost, Destructive, and Link variants.
    - Form Controls: Text Input, Textarea, Select / Dropdown, Checkbox, Radio Group, Switch, Calendar / Date Picker, and Traveller Counter / Stepper.
    - Overlays: Dialog / Modal, Sheet / Drawer, Popover, and Tooltip.
    - Feedback: Skeleton loaders, Toast notification integration, Alert banners, LoadingState, and ErrorState.
  - Icons will utilize the free icons package matching the project configuration.

- **Form Validation & State**:
  - Standardized on React Hook Form paired with Zod schemas for form state and validation. Form components will expose controlled and uncontrolled interfaces that bind with validation schemas and surface field-level errors.

- **Assisted Service & Support Trigger**:
  - The support CTA will be implemented as a responsive floating widget anchored in the bottom corner of public pages. Clicking triggers a multi-channel drawer that offers:
    - One-tap WhatsApp chat initiation with encoded contextual intent.
    - Direct phone dialling to the Abuja customer support desk.
    - A rapid consultation enquiry form.

- **Loading and Error Recovery Architecture**:
  - Unified `LoadingState` component supporting travel-aware variants (flight search, hotel availability check, price verification, payment confirmation) with stage messages.
  - Unified `ErrorState` component featuring problem explanation, retry action, alternate route suggestion, and a direct WhatsApp support escalation button.

## Testing Decisions

- **Testing Principles**:
  - Focus strictly on external, user-observable behavior and interaction boundaries rather than internal component implementation details or state variables.
  - Ensure zero false positives from stylistic tweaks by testing semantics, accessibility attributes, and user journeys.

- **Testing Seams**:
  - Composed Container Seam: Test the primary composed shells and interactive widgets:
    - `PublicLayout`: Verifies desktop navigation links render, mobile navigation drawer triggers open/close, book-a-trip action functions, and footer contact credentials appear.
    - `SupportDrawer`: Verifies opening the floating CTA displays WhatsApp, phone, and enquiry options, and emits appropriate events/links.
    - `FormControls & Validation`: Verifies input error states when bound to Zod schemas, passenger counter increments/decrements within bounds (min/max limits), and date picker selections.
    - `LoadingState & ErrorState`: Verifies that travel-aware copy and recovery buttons render as expected and action callbacks fire.
  - Automated typechecking and production build verification (`tsc --noEmit` and `next build`) must pass with zero warnings or errors.

## Out of Scope

- Backend API integration and real network requests for flight searches, hotel reservations, or payment processing (handled in Phases 2–6).
- User authentication session state, token persistence, and customer profile dashboard pages.
- Paystack payment gateway webhook processing or real payment transactions.
- CMS integration or database persistence for dynamic marketing content.

## Further Notes

- All components must strictly maintain accessibility standards (ARIA roles, semantic landmarks, keyboard focus rings, color contrast ratios).
- The foundation must avoid third-party icon packages other than the established project icon library.
