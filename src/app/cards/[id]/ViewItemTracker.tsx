// src/app/cards/[id]/ViewItemTracker.tsx
// Fires GA4 view_item once when a card detail page loads.
// Rendered from the (Server Component) card page — kept as its own tiny
// Client Component since Server Components can't call gtag directly.
"use client";

import { useEffect } from "react";
import { trackViewItem, AnalyticsItem } from "@/lib/analytics";

export default function ViewItemTracker({ item }: { item: AnalyticsItem }) {
  useEffect(() => {
    trackViewItem(item);
    // Only re-fire if the actual card changes, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.item_id]);

  return null;
}
