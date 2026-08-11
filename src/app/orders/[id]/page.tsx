"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { trackPurchase } from "@/lib/analytics";
import BackButton from "@/components/BackButton";

interface OrderTracking {
  id: number; status: string; status_display: string;
  note: string; waybill_number: string; created_at: string;
}
interface OrderItem {
  id: number;
  product: { id: number; name: string; image_small_url: string; card_set: { code: string; name: string } } | null;
  product_name: string; product_sku: string;
  quantity: number; price_at_purchase: string; subtotal: string;
}
interface Order {
  id: number; status: string; status_display: string; total_price: string;
  shipping_cost: string; discount_percent: string; discount_amount: string;
  items: OrderItem[]; tracking: OrderTracking[];
  delivery_method: string; delivery_address_line1: string; delivery_address_line2: string;
  delivery_city: string; delivery_province: string; delivery_postal_code: string;
  waybill_number: string; courier_name: string; courier_tracking_url: string;
  customer_note: string; created_at: string;
}

const STEPS = [
  { key:"pending",   label:"Order received" },
  { key:"printed",   label:"Order printed" },
  { key:"packed",    label:"Order packed" },
  { key:"booked",    label:"Courier booked" },
  { key:"ready",     label:"Ready for collection" },
  { key:"collected", label:"Courier collected" },
  { key:"invoiced",  label:"Final invoice" },
];

const STATUS_COLOR: Record<string,string> = {
  pending:"#888", printed:"#3B82F6", packed:"#8B5CF6",
  booked:"#F59E0B", ready:"#10B981", collected:"#059669",
  invoiced:"#1D4ED8", cancelled:"#EF4444",
};

const EFT_DETAILS = {
  name: "Poke Bulk SA",
  bank: "Nedbank",
  type: "Current Account",
  acc: "1301474037",
  branch: "198765",
};

function fmt(dt: string) {
  return new Date(dt).toLocaleString("en-ZA", {
    day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"
  });
}

// Order states that represent a genuinely completed order (not a cancelled
// or still-pending-payment attempt) -- these are the ones GA4 should count
// as a purchase conversion.
const PURCHASE_CONFIRMATION_RESULTS = ["success", "collection", "eft"];

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const paymentResult = searchParams?.get("payment");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingNow, setPayingNow] = useState(false);
  const [payError, setPayError] = useState("");

  // Michael, 2026-08-02: this page only ever showed a payment-status banner
  // driven by the one-time ?payment=... query param set right after
  // checkout's PayFast redirect. If the customer left PayFast before
  // finishing (closed the tab, hit back, PayFast's own page hiccuped --
  // nothing to do with our signature/sandbox config, confirmed against
  // Donovan Peach's order), the order sits at status "awaiting_payment"
  // forever with literally no way to retry from here on any later visit --
  // exactly what he reported: "no option to complete the payment". This
  // calls the same /api/payments/initiate/ endpoint checkout already uses
  // and redirects the same way, so it's a genuine retry, not a workaround.
  const completePayment = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { window.location.href = "/auth/login"; return; }
    if (!order) return;
    setPayingNow(true);
    setPayError("");
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
      const res = await fetch(`${API_URL}/api/payments/initiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment.");
      window.location.href = data.redirect_url;
    } catch (e: any) {
      setPayError(e.message || "Something went wrong starting payment.");
      setPayingNow(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setError("Please sign in."); setLoading(false); return; }
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
    fetch(`${API_URL}/api/orders/${id}/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error("Order not found"); return r.json(); })
      .then(data => { setOrder(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  // Fires GA4 purchase exactly once per order, only on a genuine order
  // confirmation landing (not on every later visit to this same page to
  // check status). Guarded with sessionStorage so a page refresh right
  // after checkout doesn't double-count the same order.
  useEffect(() => {
    if (!order) return;
    if (!paymentResult || !PURCHASE_CONFIRMATION_RESULTS.includes(paymentResult)) return;

    const guardKey = `ga4_purchase_tracked_${order.id}`;
    if (sessionStorage.getItem(guardKey)) return;

    const itemsSubtotal = order.items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const total = parseFloat(order.total_price);
    const shippingCost = Math.max(0, total - itemsSubtotal);

    trackPurchase(
      String(order.id),
      order.items.map((item) => ({
        item_id: item.product?.id ? String(item.product.id) : item.product_sku,
        item_name: item.product?.name || item.product_name,
        item_category: item.product?.card_set?.code,
        price: parseFloat(item.price_at_purchase),
        quantity: item.quantity,
      })),
      total,
      shippingCost
    );

    sessionStorage.setItem(guardKey, "1");
  }, [order, paymentResult]);

  if (loading) return <div style={{ maxWidth:680, margin:"60px auto", padding:"0 1.5rem", color:"#a0a0b0", textAlign:"center" }}>Loading...</div>;
  if (error || !order) return (
    <div style={{ maxWidth:680, margin:"60px auto", padding:"0 1.5rem", textAlign:"center" }}>
      <div style={{ color:"#EF4444", marginBottom:16 }}>{error || "Order not found"}</div>
      <BackButton fallbackHref="/orders" style={{ color:"#ff6b35" }}>Back to orders</BackButton>
    </div>
  );

  const currentStepIndex = STEPS.findIndex(s => s.key === order.status);
  const isCancelled = order.status === "cancelled";
  const trackingByStatus: Record<string, OrderTracking> = {};
  for (const t of order.tracking) { trackingByStatus[t.status] = t; }
  const col = STATUS_COLOR[order.status] || "#888";
  const card: React.CSSProperties = { background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:12, padding:"16px 20px", marginBottom:12 };

  return (
    <div style={{ maxWidth:680, margin:"40px auto", padding:"0 1.5rem" }}>
      <BackButton fallbackHref="/orders" style={{ fontSize:13, display:"flex", alignItems:"center", gap:4, marginBottom:20 }}>
        Back to orders
      </BackButton>

      {/* Payment result banners */}
      {paymentResult === "success" && (
        <div style={{ background:"#10B98122", border:"1px solid #10B98144", borderRadius:12, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>Payment Successful!</div>
          <div style={{ color:"#10B981", fontWeight:600, marginBottom:4 }}>Your payment was received and confirmed.</div>
          <div style={{ color:"#a0a0b0", fontSize:13 }}>We will start packing your order immediately.</div>
        </div>
      )}

      {paymentResult === "cancelled" && (
        <div style={{ background:"#EF444422", border:"1px solid #EF444444", borderRadius:12, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>Payment Cancelled</div>
          <div style={{ color:"#EF4444", fontWeight:600, marginBottom:4 }}>Your payment was not completed.</div>
          <div style={{ color:"#a0a0b0", fontSize:13 }}>Your order is on hold. Contact us if you need help.</div>
        </div>
      )}

      {paymentResult === "collection" && (
        <div style={{ background:"#10B98122", border:"1px solid #10B98144", borderRadius:12, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>Order Confirmed!</div>
          <div style={{ color:"#10B981", fontWeight:600, marginBottom:4 }}>Your collection order is confirmed.</div>
          <div style={{ color:"#a0a0b0", fontSize:13 }}>Pay cash when you collect at Birchleigh North. Please give us 24 hours notice!</div>
        </div>
      )}

      {/* Michael, 2026-08-02: was gated on paymentResult === "eft" alone, so
          same gap as the PayFast one -- banking details only ever showed
          right after checkout. Now also shows on any later visit while the
          order is still sitting at "pending_eft", so a customer who lost
          the details doesn't have to email in just to get the account
          number again. */}
      {(paymentResult === "eft" || order.status === "pending_eft") && (
        <div style={{ background:"#F59E0B22", border:"1px solid #F59E0B44", borderRadius:12, padding:"16px 20px", marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#F59E0B", marginBottom:12, textAlign:"center" }}>
            {paymentResult === "eft" ? "Order Placed — Awaiting EFT Payment" : "Awaiting EFT Payment"}
          </div>
          <div style={{ color:"#a0a0b0", fontSize:13, marginBottom:14, textAlign:"center" }}>
            Please make your EFT payment using the details below. Use <strong style={{ color:"#fff" }}>Order #{order.id}</strong> as your reference.
          </div>
          <div style={{ background:"#12121a", borderRadius:8, padding:14 }}>
            {[
              ["Account Name", EFT_DETAILS.name],
              ["Bank", EFT_DETAILS.bank],
              ["Account Type", EFT_DETAILS.type],
              ["Account Number", EFT_DETAILS.acc],
              ["Branch Code", EFT_DETAILS.branch],
              ["Reference", `Order #${order.id}`],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8 }}>
                <span style={{ color:"#a0a0b0" }}>{lbl}</span>
                <span style={{ color:"#fff", fontWeight: lbl === "Account Number" || lbl === "Reference" ? 700 : 400 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:12, color:"#a0a0b0", textAlign:"center" }}>
            Send proof of payment to <strong style={{ color:"#fff" }}>enquiries@pokebulk.co.za</strong>
          </div>
        </div>
      )}

      {/* Persistent retry -- shows on every visit while payment hasn't gone
          through, not just the moment right after checkout. status is only
          ever "awaiting_payment" for PayFast orders (see CheckoutView), so
          no extra payment_method check is needed here. */}
      {order.status === "awaiting_payment" && (
        <div style={{ background:"#F59E0B22", border:"1px solid #F59E0B44", borderRadius:12, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#F59E0B", marginBottom:8 }}>Payment Not Completed</div>
          <div style={{ color:"#a0a0b0", fontSize:13, marginBottom:14 }}>
            Your order is on hold until payment is completed — nothing has been charged yet. Click below to finish paying via PayFast.
          </div>
          <button
            onClick={completePayment}
            disabled={payingNow}
            style={{ background:"#ff6b35", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontSize:14, fontWeight:700, cursor: payingNow ? "default" : "pointer", opacity: payingNow ? 0.6 : 1 }}
          >
            {payingNow ? "Redirecting…" : "Complete Payment"}
          </button>
          {payError && <div style={{ color:"#EF4444", fontSize:12, marginTop:10 }}>{payError}</div>}
        </div>
      )}

      {/* Order header */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:"#fff", marginBottom:4 }}>Order #{order.id}</div>
            <div style={{ fontSize:13, color:"#a0a0b0" }}>
              {fmt(order.created_at)} · {order.delivery_method === "courier" ? "Courier" : "Collection"}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <span style={{ background:col+"22", color:col, border:`1px solid ${col}44`, padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600 }}>
              {order.status_display}
            </span>
            <div style={{ fontWeight:700, color:"#ff6b35", fontSize:18, marginTop:8 }}>R{parseFloat(order.total_price).toFixed(2)}</div>
          </div>
        </div>

        {order.waybill_number && (
          <div style={{ marginTop:14, padding:"10px 14px", background:"#12121a", borderRadius:8, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:"#555", marginBottom:2 }}>Waybill · {order.courier_name}</div>
              <div style={{ fontFamily:"monospace", fontSize:14, color:"#fff", fontWeight:600 }}>{order.waybill_number}</div>
            </div>
            {order.courier_tracking_url && (
              <a href={order.courier_tracking_url} target="_blank" rel="noopener noreferrer" style={{ color:"#ff6b35", fontSize:12, textDecoration:"none", border:"1px solid #ff6b3544", padding:"6px 12px", borderRadius:6 }}>
                Track shipment
              </a>
            )}
          </div>
        )}

        {order.delivery_address_line1 && (
          <div style={{ marginTop:12, fontSize:13, color:"#a0a0b0", lineHeight:1.6 }}>
            {order.delivery_address_line1}{order.delivery_address_line2 && `, ${order.delivery_address_line2}`},{" "}
            {order.delivery_city}, {order.delivery_province} {order.delivery_postal_code}
          </div>
        )}
      </div>

      {/* Progress */}
      {!isCancelled && (
        <div style={card}>
          <div style={{ fontSize:12, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>Order progress</div>
          {STEPS.map((step, i) => {
            const isDone = i <= currentStepIndex;
            const isActive = i === currentStepIndex;
            const tracking = trackingByStatus[step.key];
            const isLast = i === STEPS.length - 1;
            return (
              <div key={step.key} style={{ display:"flex", gap:14 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:22, flexShrink:0 }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                    background: isActive ? "#ff6b35" : isDone ? "#059669" : "#12121a",
                    border: isDone || isActive ? "none" : "1px solid #2a2a3a", fontSize:11 }}>
                    {isDone && !isActive && <span style={{ color:"#fff" }}>✓</span>}
                    {isActive && <span style={{ color:"#fff", fontSize:9 }}>●</span>}
                  </div>
                  {!isLast && <div style={{ width:1, flex:1, minHeight:18, background: isDone ? "#059669" : "#2a2a3a", margin:"3px 0" }} />}
                </div>
                <div style={{ paddingBottom: isLast ? 0 : 20, flex:1 }}>
                  <div style={{ fontSize:14, fontWeight: isActive ? 600 : 500, color: isDone ? "#fff" : "#555" }}>{step.label}</div>
                  {tracking && <div style={{ fontSize:12, color:"#555", marginTop:2 }}>{fmt(tracking.created_at)}</div>}
                  {tracking?.note && <div style={{ fontSize:13, color:"#a0a0b0", marginTop:4, lineHeight:1.5 }}>{tracking.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCancelled && (
        <div style={{ ...card, border:"1px solid #EF444444", background:"#EF444411" }}>
          <div style={{ color:"#EF4444", fontWeight:600, marginBottom:4 }}>Order cancelled</div>
          {trackingByStatus["cancelled"]?.note && <div style={{ color:"#a0a0b0", fontSize:13 }}>{trackingByStatus["cancelled"].note}</div>}
        </div>
      )}

      {/* Items */}
      <div style={card}>
        <div style={{ fontSize:12, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Items ({order.items.length})</div>
        {order.items.map(item => (
          <div key={item.id} style={{ display:"flex", gap:12, alignItems:"center", padding:"8px 0", borderBottom:"1px solid #12121a" }}>
            <div style={{ width:40, height:56, borderRadius:6, overflow:"hidden", flexShrink:0, background:"#12121a" }}>
              {item.product?.image_small_url
                ? <img src={item.product.image_small_url} alt={item.product.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🃏</div>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:"#fff", fontWeight:500, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {item.product?.name || item.product_name || "Item no longer available"}
              </div>
              <div style={{ fontSize:11, color:"#555" }}>{item.product?.card_set?.name} · x{item.quantity}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:"#ff6b35", flexShrink:0 }}>R{parseFloat(item.subtotal).toFixed(2)}</div>
          </div>
        ))}
        <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid #2a2a3a", display:"flex", flexDirection:"column", gap:6 }}>
          {parseFloat(order.discount_amount || "0") > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#10B981", fontSize:13 }}>🤝 Community discount ({parseFloat(order.discount_percent || "0").toFixed(0)}%)</span>
              <span style={{ color:"#10B981", fontSize:13, fontWeight:600 }}>-R{parseFloat(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          {order.shipping_cost !== undefined && (
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#a0a0b0", fontSize:13 }}>Shipping</span>
              <span style={{ color:"#a0a0b0", fontSize:13 }}>R{parseFloat(order.shipping_cost || "0").toFixed(2)}</span>
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:"#a0a0b0", fontSize:14 }}>Total</span>
            <span style={{ fontWeight:700, color:"#ff6b35", fontSize:16 }}>R{parseFloat(order.total_price).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {order.customer_note && (
        <div style={{ ...card, fontSize:13, color:"#a0a0b0" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Your note</div>
          {order.customer_note}
        </div>
      )}
    </div>
  );
}
