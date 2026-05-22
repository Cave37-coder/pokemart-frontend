"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface OrderTracking { id: number; status: string; status_display: string; note: string; waybill_number: string; created_at: string; }
interface Order { id: number; status: string; status_display: string; total_price: string; delivery_method: string; waybill_number: string; created_at: string; tracking: OrderTracking[]; }

const STATUS_COLOR: Record<string, string> = {
  pending:"#888", printed:"#3B82F6", packed:"#8B5CF6",
  booked:"#F59E0B", ready:"#10B981", collected:"#059669",
  invoiced:"#1D4ED8", cancelled:"#EF4444",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setError("Please sign in to view your orders."); setLoading(false); return; }
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";
    fetch(`${API_URL}/api/orders/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error("Failed to load orders"); return r.json(); })
      .then(data => { setOrders(Array.isArray(data) ? data : data.results || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div style={{ maxWidth:680, margin:"60px auto", padding:"0 1.5rem", color:"#a0a0b0", textAlign:"center" }}>Loading your orders...</div>;
  if (error) return (
    <div style={{ maxWidth:680, margin:"60px auto", padding:"0 1.5rem", textAlign:"center" }}>
      <div style={{ color:"#EF4444", marginBottom:16 }}>{error}</div>
      <Link href="/auth/login" style={{ color:"#ff6b35", textDecoration:"none" }}>Sign in</Link>
    </div>
  );

  return (
    <div style={{ maxWidth:680, margin:"40px auto", padding:"0 1.5rem" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 4px", color:"#fff" }}>My Orders</h1>
        <p style={{ color:"#a0a0b0", fontSize:14, margin:0 }}>{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
      </div>
      {orders.length === 0 ? (
        <div style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:12, padding:"48px 24px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🃏</div>
          <div style={{ color:"#a0a0b0", marginBottom:16 }}>You have not placed any orders yet.</div>
          <Link href="/cards" style={{ color:"#ff6b35", textDecoration:"none", fontWeight:600 }}>Browse cards</Link>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {orders.map(order => {
            const latest = order.tracking?.[order.tracking.length - 1];
            const col = STATUS_COLOR[order.status] || "#888";
            return (
              <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration:"none" }}>
                <div style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:12, padding:"16px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontWeight:700, color:"#fff", fontSize:15, marginBottom:4 }}>Order #{order.id}</div>
                      <div style={{ fontSize:12, color:"#555" }}>
                        {new Date(order.created_at).toLocaleDateString("en-ZA", { day:"numeric", month:"long", year:"numeric" })}
                        {" · "}{order.delivery_method === "courier" ? "Courier" : "Collection"}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ background:col+"22", color:col, border:`1px solid ${col}44`, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>
                        {order.status_display}
                      </span>
                      <div style={{ fontWeight:700, color:"#ff6b35", fontSize:16, marginTop:6 }}>
                        R{parseFloat(order.total_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {order.waybill_number && (
                    <div style={{ marginTop:10, fontSize:12, color:"#a0a0b0" }}>
                      Waybill: <span style={{ fontFamily:"monospace", color:"#fff" }}>{order.waybill_number}</span>
                    </div>
                  )}
                  {latest?.note && (
                    <div style={{ marginTop:8, fontSize:12, color:"#a0a0b0", borderTop:"1px solid #2a2a3a", paddingTop:8 }}>
                      {latest.note}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
