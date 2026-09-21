import { z } from "zod";

// Plain field shape (no cross-field rules) for composition into plain
// ZodObjects — e.g. discriminated-union members, which must stay
// ZodObject at the type level. Cross-field rules live on
// travellerCompositionSchema below and are reused via safeParse delegation.
export const travellerPartyBaseSchema = z.object({
  adults: z
    .number()
    .int()
    .min(1, "At least 1 adult traveller is required")
    .max(9, "Maximum 9 adults"),
  children: z
    .number()
    .int()
    .min(0, "Children count cannot be negative")
    .max(9, "Maximum 9 children"),
  infants: z.number().int().min(0, "Infants count cannot be negative").max(9, "Maximum 9 infants"),
});

export const travellerCompositionSchema = travellerPartyBaseSchema
  .refine((data) => data.adults + data.children + data.infants <= 9, {
    message: "Total travellers cannot exceed 9",
    path: ["adults"],
  })
  .refine((data) => data.infants <= data.adults, {
    message: "Infant count cannot exceed adult count",
    path: ["infants"],
  });

export type TravellerComposition = z.infer<typeof travellerCompositionSchema>;

export const contactEnquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(7, "Phone number is too short")
    .regex(/^[+0-9\s-()]+$/, "Please enter a valid phone number"),
  service: z.enum(["flights", "hotels", "packages", "visa", "cars", "general"]),
  message: z.string().min(10, "Please describe your travel plans (min 10 characters)"),
});

export type ContactEnquiry = z.infer<typeof contactEnquirySchema>;

export const callbackRequestSchema = z.object({
  customerName: z.string().min(2, "Enter your name so we know who to call"),
  customerPhone: z
    .string()
    .min(7, "Enter a valid phone number so we can reach you")
    .regex(/^[+0-9\s-()]+$/, "Enter a valid phone number so we can reach you"),
  customerNotes: z.string().max(280, "Keep details under 280 characters").optional(),
});

export type CallbackRequest = z.infer<typeof callbackRequestSchema>;
