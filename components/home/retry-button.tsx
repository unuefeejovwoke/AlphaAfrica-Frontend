"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Client-side retry for async RSC sections: revalidates without a full reload. */
export function RetryButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
      <span>{label}</span>
    </Button>
  );
}
