/** Sends order confirmation emails (customer + store) through Resend. */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "Sana's Books India <orders@sanabooks.in>";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

async function send(to: string, subject: string, html: string, replyTo?: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    console.error("Email not configured");
    return;
  }
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) console.error(`Resend failed [${res.status}]: ${await res.text()}`);
}

export async function sendOrderEmails(orderNumber: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!order) return;
  const { data: settings } = await supabaseAdmin.from("site_settings").select("*").limit(1).maybeSingle();
  const storeEmail =
    ((settings as Record<string, unknown> | null)?.["order_notify_email"] as string) || "stationeriessana@gmail.com";

  type Loose = { [k: string]: any } & Record<"order_items"|"product_title"|"variant_title"|"quantity"|"unit_price"|"subtotal"|"discount"|"coupon_code"|"shipping_fee"|"total"|"email"|"full_name"|"address"|"city"|"state"|"pincode"|"phone", any>;
  const o = order as unknown as Loose;
  const items = (o.order_items ?? []) as Loose[];
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${esc(i.product_title)}${i.variant_title ? ` <span style="color:#777">(${esc(i.variant_title)})</span>` : ""}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${inr(i.unit_price * i.quantity)}</td></tr>`,
    )
    .join("");
  const summary = `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr style="background:#f6f1e7"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:14px;margin-top:12px">Subtotal: ${inr(o.subtotal)}<br/>
    ${Number(o.discount) > 0 ? `Discount${o.coupon_code ? ` (${esc(o.coupon_code)})` : ""}: −${inr(o.discount)}<br/>` : ""}
    Shipping: ${Number(o.shipping_fee) === 0 ? "Free" : inr(o.shipping_fee)}<br/>
    <strong>Total paid: ${inr(o.total)}</strong></p>
    <p style="font-size:14px"><strong>Deliver to:</strong><br/>${esc(o.full_name)}<br/>${esc(o.address)}<br/>${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode ?? "")}<br/>Phone: ${esc(o.phone)}</p>`;
  const wrap = (title: string, intro: string) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1b2a4a">
      <div style="background:#1b2a4a;color:#fff;padding:18px 24px;border-radius:10px 10px 0 0"><h2 style="margin:0">Sana's Books India</h2></div>
      <div style="padding:24px;border:1px solid #eee;border-top:0;border-radius:0 0 10px 10px">
        <h3 style="margin-top:0">${title}</h3><p style="font-size:14px">${intro}</p>${summary}
      </div></div>`;

  await Promise.all([
    send(
      o.email,
      `Your order ${orderNumber} is confirmed`,
      wrap(
        `Thank you, ${esc(o.full_name)}!`,
        `We've received your payment for order <strong>${esc(orderNumber)}</strong>. We'll share tracking as soon as it ships. To track your parcel anytime, send your order ID <strong>${esc(orderNumber)}</strong> to us on WhatsApp at <a href="https://wa.me/919150113923?text=Track%20order%20${encodeURIComponent(orderNumber)}">+91 91501 13923</a>, or visit sanabooks.in/track.`,
      ),
      storeEmail,
    ),
    send(
      storeEmail,
      `New paid order ${orderNumber} — ${inr(o.total)}`,
      wrap(`New order ${esc(orderNumber)}`, `Customer: ${esc(o.full_name)} · ${esc(o.email)} · ${esc(o.phone)}`),
      o.email,
    ),
  ]);
}
