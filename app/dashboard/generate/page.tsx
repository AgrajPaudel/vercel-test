"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Wand2 } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { TrainingStatus } from "@/types/supabase"

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('completed')
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  interface Payload {
    new?: {
      status?: string; // The status property can be a string, or it might be undefined
    };
  }

  useEffect(() => {
    const checkTrainingStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: model } = await supabase
        .from('user_models')
        .select('status')
        .eq('user_id', session.user.id)
        .single()

      if (model) {
        setTrainingStatus(model.status as TrainingStatus)
        if (model.status === 'processing') {
          router.push('/dashboard')
        }
      }
    }

    checkTrainingStatus()

    const channel = supabase
      .channel('model_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_models',
        },
        (payload: Payload) => {
          if (payload.new?.status) {
            setTrainingStatus(payload.new.status as TrainingStatus);
            if (payload.new.status === 'processing') {
              router.push('/dashboard');
            }
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, router])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description of the image you want to generate",
        variant: "destructive",
      })
      return
    }

    if (trainingStatus == 'processing') {
      toast({
        title: "Model not ready",
        description: "Please wait for model training to complete",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      // Here you would typically call your image generation API
      toast({
        title: "Generation started",
        description: "Your image is being generated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  if (trainingStatus === 'processing') {
    router.push('/dashboard')
    return null
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Generate Images</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Image Generation</CardTitle>
          <CardDescription>
            Enter a description of the image you want to create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="A serene landscape with mountains..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || trainingStatus !== 'completed'}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}