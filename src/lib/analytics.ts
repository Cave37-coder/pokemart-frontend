// src/lib/analytics.ts
// GA4 event helpers for the PokeBulk funnel: view_item -> add_to_cart -> begin_checkout -> purchase
// Call these from the relevant existing pages (see integration notes in chat).
// Docs: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

function sendEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}

export interface AnalyticsItem {
  item_id: string;       // pb_id or product id
  item_name: string;     // card name
  item_category?: string; // e.g. card_set code
  item_variant?: string;  // e.g. "Reverse Holo"
  price: number;
  quantity?: number;
}

// Fire when a product/card detail page loads
export function trackViewItem(item: AnalyticsItem) {
  sendEvent("view_item", {
    currency: "ZAR",
    value: item.price,
    items: [item],
  });
}

// Fire when a card listing page (Browse Cards / checklists) loads
export function trackViewItemList(items: AnalyticsItem[], listName: string) {
  sendEvent("view_item_list", {
    item_list_name: listName,
    items,
  });
}

// Fire on successful "Add to Cart" click
export function trackAddToCart(item: AnalyticsItem) {
  sendEvent("add_to_cart", {
    currency: "ZAR",
    value: item.price * (item.quantity ?? 1),
    items: [item],
  });
}

// Fire when the cart page loads / user starts checkout
export function trackBeginCheckout(items: AnalyticsItem[], totalValue: number) {
  sendEvent("begin_checkout", {
    currency: "ZAR",
    value: totalValue,
    items,
  });
}

// Fire when shipping method is selected (custom funnel step - helps isolate drop-off)
export function trackAddShippingInfo(items: AnalyticsItem[], totalValue: number, shippingTier: string) {
  sendEvent("add_shipping_info", {
    currency: "ZAR",
    value: totalValue,
    shipping_tier: shippingTier,
    items,
  });
}

// Fire on successful order confirmation (PayFast callback success / order created)
export function trackPurchase(
  transactionId: string,
  items: AnalyticsItem[],
  totalValue: number,
  shippingCost: number
) {
  sendEvent("purchase", {
    transaction_id: transactionId,
    currency: "ZAR",
    value: totalValue,
    shipping: shippingCost,
    items,
  });
}
