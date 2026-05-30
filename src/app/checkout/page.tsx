"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

const DELIVERY_OPTIONS = [
  { id: "collection",        label: "Collection",                          price: 0,   desc: "Collect from Birchleigh North, Kempton Park. Mon-Fri 18:30-21:00 | Sat 10:00-18:00 | Sun 10:00-15:00. Please give 24hrs notice!", courier: false },
  { id: "pudo_locker",       label: "Pudo — Locker to Locker (XSmall)",   price: 75,  desc: "1-4 business days. Delivered to your nearest Pudo locker.", courier: true },
  { id: "pudo_kiosk",        label: "Pudo — Locker to Kiosk (XSmall)",    price: 85,  desc: "1-4 business days. Collect from your nearest Pudo kiosk.", courier: true },
  { id: "pudo_medium",       label: "Pudo — Medium/Tins (Kiosk)",         price: 95,  desc: "For tins or larger items. Collect from your nearest Pudo kiosk.", courier: true },
  { id: "pudo_door",         label: "Pudo — Locker to Door (XSmall)",     price: 105, desc: "2-4 business days. Delivered to your door.", courier: true },
  { id: "postnet",           label: "Postnet to Postnet",                  price: 130, desc: "2-5 business days. Collect from your nearest PostNet branch.", courier: true },
];

const COLLECTION_PAYMENT = [
  { id: "coc",     label: "Cash on Collection (COC)", desc: "Pay cash when you collect your order." },
  { id: "eft",     label: "EFT / Bank Transfer",      desc: "Pay into our bank account before collecting. Order processed once payment reflects." },
  { id: "payfast", label: "PayFast",                  desc: "Pay securely by card, instant EFT or SnapScan via PayFast." },
];

const COURIER_PAYMENT = [
  { id: "eft",     label: "EFT / Bank Transfer", desc: "Pay into our bank account. Order dispatched once payment reflects." },
  { id: "payfast", label: "PayFast",             desc: "Pay securely by card, instant EFT or SnapScan via PayFast." },
];

const EFT_DETAILS = {
  name:   "Poke Bulk SA",
  bank:   "Nedbank",
  type:   "Current Account",
  acc:    "1301474037",
  branch: "198765",
};

interface Profile {
  first_name: string; last_name: string; email: string; phone_number: string;
  delivery_preference: string;
  address_line1: string; address_line2: string; address_city: string;
  address_province: string; address_postal_code: string;
  pudo_locker_name: string; pudo_locker_address: string; pudo_locker_code: string;
}

interface CartItem {
  id: number; quantity: number; subtotal: string;
  product: { id: number; name: string; price: string; image_small_url: string; card_set: { code: string; name: string } };
}

interface Cart { id: number; total: string; items: CartItem[]; }

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart]         = useState<Cart | null>(null);
  const [shipping, setShipping] = useState("collection");
  const [payment, setPayment]   = useState("coc");
  const [note, setNote]         = useState("");
  const [loading, setLoading]   = useState(true);
  const [placing, setPlacing]   = useState(false);
  const [error, setError]       = useState("");
  const [delivery, setDelivery] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    address_line1: "", address_line2: "", city: "", province: "", postal_code: "",
    pudo_locker_name: "", pudo_locker_address: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/auth/login"); return; }
    Promise.all([
      fetch(`${API_URL}/api/cart/`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/auth/profile/`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([cartData, profileData]) => {
      setCart(cartData);
      setDelivery({
        first_name:          profileData.first_name || "",
        last_name:           profileData.last_name  || "",
        email:               profileData.email      || "",
        phone:               profileData.phone_number || "",
        address_line1:       profileData.address_line1 || "",
        address_line2:       profileData.address_line2 || "",
        city:                profileData.address_city || "",
        province:            profileData.address_province || "",
        postal_code:         profileData.address_postal_code || "",
        pudo_locker_name:    profileData.pudo_locker_name || "",
        pudo_locker_address: profileData.pudo_locker_address || "",
      });
      setLoading(false);
    }).catch(() => { setError("Failed to load checkout data."); setLoading(false); });
  }, []);

  const selectedDelivery = DELIVERY_OPTIONS.find(d => d.id === shipping)!;
  const isCourier        = selectedDelivery?.courier ?? false;
  const paymentOptions   = isCourier ? COURIER_PAYMENT : COLLECTION_PAYMENT;

  // Reset payment to valid option when delivery changes
  useEffect(() => {
    if (isCourier && payment === "coc") setPayment("eft");
    if (!isCourier && !["coc","eft","payfast"].includes(payment)) setPayment("coc");
  }, [isCourier]);

  const shippingCost = selectedDelivery?.price || 0;
  const cartTotal    = parseFloat(cart?.total || "0");
  const orderTotal   = cartTotal + shippingCost;
  const items        = cart?.items || [];

  const needsAddress  = ["pudo_door","postnet"].includes(shipping);
  const needsLocker   = ["pudo_locker","pudo_kiosk","pudo_medium"].includes(shipping);

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: "100%", background: "#12121a", border: "1px solid #2a2a3a",
    borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13,
    boxSizing: "border-box", ...style,
  });

  const card = (style?: React.CSSProperties): React.CSSProperties => ({
    background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: 20, ...style,
  });

  const placeOrder = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setPlacing(true);
    setError("");
    try {
      const orderRes = await fetch(`${API_URL}/api/checkout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          delivery_method:     isCourier ? "courier" : "collection",
          address_line1:       delivery.address_line1,
          address_line2:       delivery.address_line2,
          city:                delivery.city,
          province:            delivery.province,
          postal_code:         delivery.postal_code,
          customer_note:       note,
          shipping_method:     shipping,
          shipping_cost:       shippingCost,
          payment_method:      payment,
          pudo_locker_name:    delivery.pudo_locker_name,
          pudo_locker_address: delivery.pudo_locker_address,
        }),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Failed to create order");
      }
      const order = await orderRes.json();

      // Save profile details
      await fetch(`${API_URL}/api/auth/profile/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: delivery.first_name, last_name: delivery.last_name,
          phone_number: delivery.phone, address_line1: delivery.address_line1,
          address_line2: delivery.address_line2, address_city: delivery.city,
          address_province: delivery.province, address_postal_code: delivery.postal_code,
          pudo_locker_name: delivery.pudo_locker_name, pudo_locker_address: delivery.pudo_locker_address,
          delivery_preference: isCourier ? "pudo" : "collection",
        }),
      });

      window.dispatchEvent(new Event("pile-updated"));

      if (payment === "coc") { router.push(`/orders/${order.id}?payment=collection`); return; }
      if (payment === "eft") { router.push(`/orders/${order.id}?payment=eft`); return; }

      // PayFast
      const pfRes = await fetch(`${API_URL}/api/payments/initiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: order.id }),
      });
      if (!pfRes.ok) {
        const pfErr = await pfRes.json().catch(() => ({}));
        throw new Error(pfErr.error || "Failed to initiate PayFast payment");
      }
      const pfData = await pfRes.json();
      window.location.href = pfData.redirect_url;
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setPlacing(false);
    }
  };

  if (loading) return <div style={{ maxWidth:800, margin:"60px auto", padding:"0 1.5rem", color:"#a0a0b0", textAlign:"center" }}>Loading checkout...</div>;
  if (items.length === 0) return (
    <div style={{ maxWidth:600, margin:"60px auto", padding:"0 1.5rem", textAlign:"center" }}>
      <div style={{ color:"#a0a0b0", marginBottom:16 }}>Your pile is empty.</div>
      <Link href="/cards" style={{ color:"#ff6b35", textDecoration:"none", fontWeight:600 }}>Browse cards</Link>
    </div>
  );

  const btnLabel = () => {
    if (placing) return "Processing...";
    if (payment === "coc") return `Place Order (COC) — R ${orderTotal.toFixed(2)}`;
    if (payment === "eft") return `Place Order (EFT) — R ${orderTotal.toFixed(2)}`;
    return `Pay with PayFast — R ${orderTotal.toFixed(2)}`;
  };

  const btnNote = () => {
    if (payment === "coc") return "Pay cash when you collect at Birchleigh North";
    if (payment === "eft") return "Order held until EFT payment reflects in our account";
    return "You'll be redirected to PayFast to complete payment securely";
  };

  return (
    <div style={{ maxWidth:900, margin:"32px auto", padding:"0 1.5rem" }}>
      <h1 style={{ fontSize:22, fontWeight:700, color:"#fff", marginBottom:24 }}>Checkout</h1>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:24, alignItems:"start" }}>

        {/* LEFT */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Contact */}
          <div style={card()}>
            <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 14px" }}>Contact details</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {([["First name","first_name","Ash"],["Last name","last_name","Ketchum"],["Email","email","ash@pokemon.com"],["Phone","phone","074 000 0000"]] as [string,string,string][]).map(([lbl,key,ph]) => (
                <div key={key}>
                  <label style={{ fontSize:11, color:"#a0a0b0", display:"block", marginBottom:4 }}>{lbl}</label>
                  <input style={inp()} value={(delivery as any)[key]} onChange={e => setDelivery(d => ({...d,[key]:e.target.value}))} placeholder={ph} type={key==="email"?"email":"text"} />
                </div>
              ))}
            </div>
          </div>

          {/* Delivery method */}
          <div style={card()}>
            <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 14px" }}>Delivery method</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {DELIVERY_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setShipping(opt.id)} style={{
                  background: shipping===opt.id ? "#ff6b3515" : "#12121a",
                  border:`1px solid ${shipping===opt.id?"#ff6b35":"#2a2a3a"}`,
                  borderRadius:8, padding:"12px 14px", cursor:"pointer",
                  display:"flex", justifyContent:"space-between", alignItems:"flex-start", textAlign:"left",
                }}>
                  <div>
                    <div style={{ fontWeight:600, color:shipping===opt.id?"#ff6b35":"#fff", fontSize:13, marginBottom:2 }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:"#a0a0b0", lineHeight:1.5, maxWidth:320 }}>{opt.desc}</div>
                  </div>
                  <div style={{ fontWeight:700, color:shipping===opt.id?"#ff6b35":"#a0a0b0", fontSize:14, marginLeft:12, flexShrink:0 }}>
                    {opt.price===0?"FREE":`R ${opt.price}`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pudo locker details */}
          {needsLocker && (
            <div style={card()}>
              <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 6px" }}>Pudo locker / kiosk details</h2>
              <p style={{ fontSize:12, color:"#a0a0b0", margin:"0 0 14px" }}>
                Find your nearest location at <a href="https://www.pudo.co.za/find-a-locker" target="_blank" rel="noreferrer" style={{ color:"#ff6b35" }}>pudo.co.za</a>
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div>
                  <label style={{ fontSize:11, color:"#a0a0b0", display:"block", marginBottom:4 }}>Locker / Kiosk name</label>
                  <input style={inp()} value={delivery.pudo_locker_name} onChange={e => setDelivery(d=>({...d,pudo_locker_name:e.target.value}))} placeholder="e.g. Birchleigh North Mall" />
                </div>
                <div>
                  <label style={{ fontSize:11, color:"#a0a0b0", display:"block", marginBottom:4 }}>Locker / Kiosk address</label>
                  <input style={inp()} value={delivery.pudo_locker_address} onChange={e => setDelivery(d=>({...d,pudo_locker_address:e.target.value}))} placeholder="e.g. Mooifontein Rd, Birchleigh North" />
                </div>
              </div>
            </div>
          )}

          {/* Door / Postnet address */}
          {needsAddress && (
            <div style={card()}>
              <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 14px" }}>Delivery address</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div>
                  <label style={{ fontSize:11, color:"#a0a0b0", display:"block", marginBottom:4 }}>Address line 1</label>
                  <input style={inp()} value={delivery.address_line1} onChange={e=>setDelivery(d=>({...d,address_line1:e.target.value}))} placeholder="4 Heliose Street" />
                </div>
                <div>
                  <label style={{ fontSize:11, color:"#a0a0b0", display:"block", marginBottom:4 }}>Address line 2 (optional)</label>
                  <input style={inp()} value={delivery.address_line2} onChange={e=>setDelivery(d=>({...d,address_line2:e.target.value}))} placeholder="Complex / Unit" />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 120px", gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, color:"#a0a0b0", display:"block", marginBottom:4 }}>City</label>
                    <input style={inp()} value={delivery.city} onChange={e=>setDelivery(d=>({...d,city:e.target.value}))} placeholder="Kempton Park" />
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:"#a0a0b0", display:"block", marginBottom:4 }}>Province</label>
                    <input style={inp()} value={delivery.province} onChange={e=>setDelivery(d=>({...d,province:e.target.value}))} placeholder="Gauteng" />
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:"#a0a0b0", display:"block", marginBottom:4 }}>Postal code</label>
                    <input style={inp()} value={delivery.postal_code} onChange={e=>setDelivery(d=>({...d,postal_code:e.target.value}))} placeholder="1618" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment method */}
          <div style={card()}>
            <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 14px" }}>Payment method</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {paymentOptions.map(opt => (
                <button key={opt.id} onClick={() => setPayment(opt.id)} style={{
                  background: payment===opt.id ? "#ff6b3515" : "#12121a",
                  border:`1px solid ${payment===opt.id?"#ff6b35":"#2a2a3a"}`,
                  borderRadius:8, padding:"12px 14px", cursor:"pointer", textAlign:"left",
                }}>
                  <div style={{ fontWeight:600, color:payment===opt.id?"#ff6b35":"#fff", fontSize:13, marginBottom:2 }}>{opt.label}</div>
                  <div style={{ fontSize:11, color:"#a0a0b0" }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* EFT banking details */}
            {payment === "eft" && (
              <div style={{ marginTop:14, background:"#12121a", border:"1px solid #2a2a3a", borderRadius:8, padding:14 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:10 }}>Banking Details</div>
                {([
                  ["Account Name", EFT_DETAILS.name],
                  ["Bank",         EFT_DETAILS.bank],
                  ["Account Type", EFT_DETAILS.type],
                  ["Account Number", EFT_DETAILS.acc],
                  ["Branch Code",  EFT_DETAILS.branch],
                  ["Reference",    `${delivery.first_name} ${delivery.last_name}`.trim() || "Your name"],
                ] as [string,string][]).map(([lbl,val]) => (
                  <div key={lbl} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                    <span style={{ color:"#a0a0b0" }}>{lbl}</span>
                    <span style={{ color:"#fff", fontWeight:lbl==="Account Number"?700:400 }}>{val}</span>
                  </div>
                ))}
                <div style={{ marginTop:10, fontSize:11, color:"#F59E0B" }}>
                  Send proof of payment to enquiries@pokebulk.co.za with your order number as reference.
                </div>
              </div>
            )}

            {/* PayFast card logos */}
            {payment === "payfast" && (
              <div style={{ marginTop:14, display:"flex", gap:6, flexWrap:"wrap" }}>
                {["VISA","Mastercard","Instant EFT","SnapScan"].map(m => (
                  <span key={m} style={{ fontSize:10, color:"#555", background:"#12121a", border:"1px solid #2a2a3a", borderRadius:4, padding:"2px 7px" }}>{m}</span>
                ))}
              </div>
            )}
          </div>

          {/* Order notes */}
          <div style={card()}>
            <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 10px" }}>Order notes (optional)</h2>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Any special requests..."
              style={{ ...inp(), resize:"vertical", minHeight:70 }} />
          </div>
        </div>

        {/* RIGHT — Order summary */}
        <div style={{ position:"sticky", top:20 }}>
          <div style={card()}>
            <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 14px" }}>Order summary</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
              {items.map(item => (
                <div key={item.id} style={{ display:"flex", gap:10, alignItems:"center" }}>
                  {item.product.image_small_url && (
                    <img src={item.product.image_small_url} alt={item.product.name} style={{ width:36, height:50, objectFit:"cover", borderRadius:4, flexShrink:0 }} />
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:"#ddd", fontWeight:500, lineHeight:1.3 }}>{item.product.name}</div>
                    <div style={{ fontSize:11, color:"#555" }}>Qty {item.quantity}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff", flexShrink:0 }}>R {parseFloat(item.subtotal).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop:"1px solid #2a2a3a", paddingTop:12, display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#a0a0b0" }}>
                <span>Subtotal</span><span>R {cartTotal.toFixed(2)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#a0a0b0" }}>
                <span>Shipping</span>
                <span style={{ color:shippingCost===0?"#10B981":"#fff" }}>
                  {shippingCost===0?"FREE":`R ${shippingCost}.00`}
                </span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:700, color:"#fff", marginTop:6, paddingTop:8, borderTop:"1px solid #2a2a3a" }}>
                <span>Total</span>
                <span style={{ color:"#ff6b35" }}>R {orderTotal.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div style={{ background:"#EF444420", border:"1px solid #EF444440", borderRadius:8, padding:"10px 12px", marginTop:12, color:"#EF4444", fontSize:12 }}>
                {error}
              </div>
            )}

            <button onClick={placeOrder} disabled={placing} style={{
              width:"100%", background:placing?"#cc5528":"#ff6b35",
              color:"#fff", border:"none", borderRadius:8,
              padding:"14px", fontSize:15, fontWeight:700,
              cursor:placing?"not-allowed":"pointer", marginTop:14,
            }}>
              {btnLabel()}
            </button>

            <div style={{ textAlign:"center", marginTop:8, fontSize:11, color:"#555" }}>
              {btnNote()}
            </div>
          </div>

          <div style={{ marginTop:12 }}>
            <Link href="/pile" style={{ color:"#a0a0b0", fontSize:12, textDecoration:"none" }}>← Back to pile</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
