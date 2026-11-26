"use client";
// Order timing notice. 2026-11-26, Michael: customers no longer see the live
// calculated prep-time figure (it set expectations we can't always keep, and
// we're a secondary, after-hours business). They see this fixed, friendly
// wording instead. The live figure is still calculated by pokemart-api
// (GET /api/prep-time/, orders/prep_time.py, override in Django admin) and still
// drives the collection date picker and the admin pages -- it just isn't shown here.

const WHATSAPP = "https://wa.me/27744886919";
const PHONE_HREF = "tel:+27744886919";
const PHONE_TEXT = "074 488 6919";

const linkStyle = { color: "#ff6b35", fontWeight: 600, textDecoration: "none" } as const;

function ContactLinks() {
  return (
    <>
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={linkStyle}>WhatsApp</a>
      {" or "}
      <a href={PHONE_HREF} style={linkStyle}>call us on {PHONE_TEXT}</a>
    </>
  );
}

/** Landing page strip. */
export function PrepTimeBanner() {
  return (
    <div style={{ background:"#12121a", borderBottom:"1px solid #2a2a3a", padding:"14px 2rem" }}>
      <div style={{ maxWidth:"900px", margin:"0 auto", textAlign:"center", fontSize:"14px", lineHeight:1.6, color:"#a0a0b0" }}>
        <strong style={{ color:"#ff6b35" }}>Packed after hours, by real humans.</strong>{" "}
        We&apos;re a growing, self-run side business, so orders are packed and ready to ship within about a week.
        Busy spells, especially month end, can stretch that a little. Thanks for your patience, your cards are worth the wait!
        <div style={{ marginTop:6 }}>
          Special requirements? <ContactLinks /> and we&apos;ll do our best to secure an early delivery.
        </div>
      </div>
    </div>
  );
}

/** Checkout notice, worded for collection vs Pudo delivery. */
export function PrepTimeCheckout({ courier }: { courier: boolean }) {
  return (
    <div style={{ background:"#ff6b3512", border:"1px solid #ff6b3540", borderRadius:8, padding:"10px 12px", marginTop:12, fontSize:12, color:"#a0a0b0", lineHeight:1.6 }}>
      <div style={{ color:"#fff", fontWeight:600, marginBottom:2 }}>Order timing</div>
      {courier ? (
        <>
          PokeBulk is a growing, self-run side business, packed after our day jobs. Orders are ready to ship within about a week,
          depending on how many come in (month end is our busiest time). Once packed, your parcel goes to Pudo, and their delivery
          time is on top of this. We&apos;ll message you the moment it&apos;s on its way.
          <div style={{ marginTop:6, color:"#fff" }}>
            Special requirements? <ContactLinks /> to secure an early delivery.
          </div>
        </>
      ) : (
        <>
          PokeBulk is a growing, self-run side business, packed after our day jobs. Orders are ready within about a week,
          depending on how many come in (month end is our busiest time). We&apos;ll message you when yours is ready for collection.
          Please give us 24 hours&apos; notice before you come.
          <div style={{ marginTop:6, color:"#fff" }}>
            Need it sooner? <ContactLinks /> to secure an early date, or pick your desired collection day below.
          </div>
        </>
      )}
    </div>
  );
}
