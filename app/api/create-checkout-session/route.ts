import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  try {
    const { priceId, userId } = await req.json()
    const headersList = headers()
    const origin = headersList.get("origin")

    const supabase = createClient()
    
    // Get user's email from Supabase
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId,
        },
      },
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: "Error creating checkout session" },
      { status: 500 }
    )
  }
}