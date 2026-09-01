import {
  handleStripeEvent,
  verifyWebhook,
} from "@/server/services/billing-service";

// Raw body is required for signature verification, so this route reads
// req.text() itself and never goes through withErrorHandling.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const payload = await req.text();

  let event;
  try {
    event = verifyWebhook(payload, signature);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Return 500 so Stripe retries; the handler is idempotent.
    console.error(`Stripe webhook handler failed for ${event.type}:`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
