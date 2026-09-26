import { createServerFn } from "@tanstack/react-start";

/** Creates a Razorpay order for an amount in rupees and returns the checkout handles. */
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { amount: number; receipt: string }) => {
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Invalid amount");
    return { amount: Math.round(input.amount * 100), receipt: String(input.receipt).slice(0, 40) };
  })
  .handler(async ({ data }) => {
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !keySecret) throw new Error("Online payments are not configured yet.");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: data.amount,
        currency: "INR",
        receipt: data.receipt,
        payment_capture: 1,
      }),
    });

    if (!res.ok) {
      console.error("razorpay order failed", res.status, await res.text());
      throw new Error("Could not start the payment. Please try again.");
    }

    const order = (await res.json()) as { id: string; amount: number };
    return { razorpayOrderId: order.id, amount: order.amount, keyId };
  });

/** Verifies the Razorpay signature and marks the order paid. */
export const confirmRazorpayPayment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      orderNumber: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      signature: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keySecret) throw new Error("Online payments are not configured yet.");

    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.signature || "");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false as const, reason: "Payment could not be verified." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        payment_id: data.razorpayPaymentId,
        payment_order_id: data.razorpayOrderId,
      })
      .eq("order_number", data.orderNumber);
    if (error) console.error("order payment update failed", error.message);

    return { ok: true as const };
  });

/** Marks a still-pending online order as cancelled/failed when the shopper closes Razorpay. */
export const markPaymentFailed = createServerFn({ method: "POST" })
  .inputValidator((input: { orderNumber: string; reason: "cancelled" | "failed" }) => ({
    orderNumber: String(input.orderNumber).slice(0, 40),
    reason: input.reason === "failed" ? "failed" : "cancelled",
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: data.reason })
      .eq("order_number", data.orderNumber)
      .eq("payment_status", "pending");
    return { ok: true };
  });
