"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Share01Icon, ArrowRight01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatNaira } from "@/lib/format";

export function PackageShareButton({
  title,
  destinationName,
}: {
  title: string;
  destinationName: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: `${title} | Alphaa Africa`,
      text: `Check out this holiday package to ${destinationName} on Alphaa Africa:`,
      url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard copy if user dismissed or cancelled native share
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard", {
        description: "You can now paste and share this package with friends and family.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share package"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary/40 hover:text-primary active:scale-[0.98]"
    >
      <HugeiconsIcon
        icon={copied ? Tick01Icon : Share01Icon}
        size={14}
        className={copied ? "text-emerald-600" : "text-muted-foreground"}
        aria-hidden="true"
      />
      <span>{copied ? "Copied" : "Share"}</span>
    </button>
  );
}

export function PackageMobileBar({
  price,
  title,
}: {
  price: string;
  title: string;
}) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down past 350px
      if (window.scrollY > 350) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToEnquiry = () => {
    const element = document.getElementById("enquiry");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Quick booking bar"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border/80 bg-background/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom duration-200"
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            From
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground truncate">
              {formatNaira(price)}
            </span>
            <span className="text-[11px] text-muted-foreground">/ person</span>
          </div>
        </div>

        <Button
          onClick={scrollToEnquiry}
          size="sm"
          className="shrink-0 gap-1.5 shadow-md"
        >
          <span>Enquire now</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}
