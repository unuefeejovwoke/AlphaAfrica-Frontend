# Alphaa Africa Platform

A premium travel booking and assisted-service platform providing self-service reservations and human-assisted journeys for African and international travellers.

## Language

**Guest Booking**:
A reservation initiated and completed without requiring customer account registration or login.
_Avoid_: Anonymous order, quick checkout

**Assisted Service**:
A travel arrangement (such as holiday packages or visa assistance) coordinated with human travel specialists via WhatsApp or consultation.
_Avoid_: Offline booking, concierge, manual ticketing

**Traveller**:
An individual passenger or guest undertaking travel on a booking.
_Avoid_: Passenger, occupant, ticket holder

**Customer**:
The primary contact or paying party who books services or submits an enquiry.
_Avoid_: Client, buyer, account holder

**Booking**:
A confirmed, paid or reserved flight, hotel, or car rental with a verified reference code (PNR or reservation ID).
_Avoid_: Order, transaction, ticket

**Enquiry**:
A no-payment request submitted by a customer for package travel planning and follow-up by travel specialists.
_Avoid_: Lead, ticket, contact form submission, visa enquiry

**Visa Consultation**:
A paid request for country-specific visa guidance, including consultation-fee payment.
_Avoid_: Visa Application, visa booking, visa enquiry

**Destination**:
A travel place or country grouping that lists its active packages with package count and starting price.
_Avoid_: Country page, tour location

**Package**:
A curated sellable itinerary for one destination with duration, from-price per person, and inclusions/highlights.
_Avoid_: Tour, deal, offer

**Flight Offer**:
A raw selectable flight result from search, carrying an opaque fare blob for revalidation.
_Avoid_: Flight card, deal, ticket

**Confirmed Offer**:
A Flight Offer with live fare revalidated via price confirmation, ready for traveller entry.
_Avoid_: Priced offer, final price

**Pending Booking**:
A Confirmed Offer plus travellers and contact submitted for payment, awaiting verification.
_Avoid_: Order, reservation attempt

**PNR**:
The airline order reference created only after successful payment verification.
_Avoid_: Booking ID, ticket number

**Payment Reference**:
The Paystack transaction identifier linking a Pending Booking to verification.
_Avoid_: Order ID, transaction ID

**Domestic Flight Card**:
A normalized QuickAir result streamed progressively, without an opaque offer blob.
_Avoid_: Local offer, domestic deal
