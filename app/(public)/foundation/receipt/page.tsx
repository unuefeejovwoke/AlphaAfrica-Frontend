"use client"

import { FlightReceiptView } from "@/components/flights/flight-receipt-view"
import { flightBookingSchema } from "@/lib/api/flight-bookings"

const booking = flightBookingSchema.parse({
  reference: "ALPHAA-7QK4X2",
  status: "confirmed",
  pnr: "XKQ9PL",
  amadeus_order_id: "eJzTd9c39_c3CzcCAArEAjo",
  ticketing_deadline: "2026-11-02",
  ticket_numbers: ["1762401234567"],
  contact_name: "Adaeze Okafor",
  origin: "LOS",
  destination: "DXB",
  departure_date: "2026-11-04",
  num_adults: 2,
  num_children: 0,
  num_infants: 0,
  total_amount: "1284500.50",
  currency: "NGN",
  travelers: [
    { first_name: "Adaeze", last_name: "Okafor", type: "ADULT" },
    { first_name: "Chidi", last_name: "Okafor", type: "ADULT" },
  ],
  flight_details: {
    airline_code: "EK",
    airline_name: "Emirates",
    cabin: "ECONOMY",
    seats_available: 4,
    itineraries: [
      {
        duration: "7h 20m",
        stops: 0,
        segments: [
          {
            from: "LOS",
            to: "DXB",
            depart_at: "2026-11-04T09:35",
            arrive_at: "2026-11-04T19:55",
            flight_number: "EK783",
          },
        ],
      },
    ],
  },
})

/**
 * `/foundation/receipt` — fixture preview of the paid Booking receipt so the
 * document can be reviewed and iterated on without a live paid booking. The
 * real receipt renders through FlightVerifyClient on `/order`.
 */
export default function ReceiptPreviewPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
      <FlightReceiptView
        booking={booking}
        order={null}
        tickets={{ ticketed: true, numbers: ["1762401234567"] }}
        ticketsFailed={false}
        onCheckTickets={() => {}}
      />
    </div>
  )
}
