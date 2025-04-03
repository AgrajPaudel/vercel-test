import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase"
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    // Verify webhook signature (implement proper verification in production)
    const headersList = headers()
    const signature = headersList.get("x-replicate-signature")
    
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      )
    }

    const payload = await req.json()
    const { status, id: trainingId, output, error } = payload

    const supabase = createClient()

    // Get the training record
    const { data: training, error: trainingError } = await supabase
      .from('lora_training')
      .select('user_id, id')
      .eq('id', trainingId)
      .single()

    if (trainingError || !training) {
      throw new Error('Training record not found')
    }

    if (status === 'succeeded') {
      // Update training status
      await supabase
        .from('lora_training')
        .update({
          training_status: 'ready_for_generation',
          output_lora: output?.lora_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', trainingId)

      // Get user email
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', training.user_id)
        .single()

      if (user?.email) {
        // Send email notification
        await resend.emails.send({
          from: 'AI Image Generator <noreply@example.com>',
          to: user.email,
          subject: 'Your AI Model Training is Complete',
          html: `
            <h1>Training Complete!</h1>
            <p>Your AI model training has completed successfully. You can now start generating images using your custom model.</p>
            <p>Visit the dashboard to start creating: <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/generate">Generate Images</a></p>
          `
        })
      }
    } else if (status === 'failed') {
      await supabase
        .from('lora_training')
        .update({
          training_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', trainingId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}