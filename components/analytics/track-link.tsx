"use client";

import * as React from "react";
import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics";

export interface TrackLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  event: AnalyticsEvent;
  eventProps?: AnalyticsProps;
}

/**
 * Anchor that records an allowlisted analytics event on click, then follows
 * `href` normally. Used for WhatsApp/support hatches so §22 stays truthful
 * without intercepting navigation.
 */
export function TrackLink({ event, eventProps, onClick, ...anchorProps }: TrackLinkProps) {
  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      track(event, eventProps);
      onClick?.(e);
    },
    [event, eventProps, onClick],
  );
  return <a {...anchorProps} onClick={handleClick} />;
}
