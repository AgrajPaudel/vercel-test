import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { TrainingStatus } from "@/types/supabase"

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { imageUrls } = await req.json()

    // Validate number of images
    if (!Array.isArray(imageUrls) || imageUrls.length < 10) {
      return NextResponse.json(
        { error: "At least 10 images are required for training" },
        { status: 400 }
      )
    }

    // Check if training is already in progress
    const { data: existingTraining } = await supabase
      .from('lora_training')
      .select()
      .eq('user_id', session.user.id)
      .eq('training_status', 'processing')
      .single()

    if (existingTraining) {
      return NextResponse.json(
        { error: "Training is already in progress" },
        { status: 409 }
      )
    }

    // Create training record
    const { error: trainingError } = await supabase
      .from('lora_training')
      .upsert({
        user_id: session.user.id,
        input_files: imageUrls,
        training_status: 'processing' as TrainingStatus,
      })

    if (trainingError) {
      throw trainingError
    }

    // Simulate training process (30 seconds)
    setTimeout(async () => {
      await supabase
        .from('lora_training')
        .update({ 
          training_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id)
        .eq('training_status', 'processing')
    }, 30000)

    return NextResponse.json({ status: "training_started" })
  } catch (error) {
    console.error("Training error:", error)
    return NextResponse.json(
      { error: "Failed to start training" },
      { status: 500 }
    )
  }
}