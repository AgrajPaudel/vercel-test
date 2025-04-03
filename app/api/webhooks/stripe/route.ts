import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("stripe-signature")

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    )
  }

  const supabase = createClient()

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        const subscription = event.data.object
        const userId = subscription.metadata.userId

        // Update user's subscription status in Supabase
        await supabase
          .from("user_subscriptions")
          .insert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            stripe_price_id: subscription.items.data[0].price.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000),
          }as any)

        break

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object
        const deletedUserId = deletedSubscription.metadata.userId

        // Update subscription status to canceled
        await supabase
          .from("user_subscriptions")
          .update({ status: "canceled" } as any)
          .match({ stripe_subscription_id: deletedSubscription.id })

        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error handling webhook:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}