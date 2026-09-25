# Route Group Layout Boundaries

We structure the App Router using route groups `(public)` and `(checkout)` rather than a single monolithic root layout. Both groups render the same `SiteShell` — full navigation, floating WhatsApp support, and the marketing footer — so the interface never switches chrome mid-journey and guests can leave checkout the same way they entered it.

Revised with the one-page checkout flow (fare confirmation on the results page → `/checkout`). The original decision kept booking and payment in a distraction-free shell with minimal egress; guest feedback that checkout felt like a different product outweighed the conversion concern, and focus is now carried by the per-page `FlightJourneyHeader`, the persistent Trip and price summary, and the sticky Pay action instead of by removing navigation.

Considered Options: keep the distraction-free checkout shell; move only the flight checkout + verify pages into `(public)` and leave hotels distraction-free; give only the merged checkout page the public shell (flow changes chrome mid-booking).

Consequences: checkout pages own their progress and trust cues rather than inheriting them from a custom header; the retired `/checkout/payment` route redirects to `/checkout`; hotel booking pages share the same shell without any booking-logic change; support-widget placement must not overlap the sticky Pay bar on single-column screens.
