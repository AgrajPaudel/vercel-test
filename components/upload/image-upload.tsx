"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileUpload } from "./file-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { createClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { X, Plus } from "lucide-react"
import { TrainingStatus } from "@/types/supabase"
import JSZip from 'jszip'

interface UploadedImage {
  url: string
  id: string
  file: File
}

interface TrainingParams {
  steps: number
  loraRank: number
  batchSize: number
  learningRate: number
  optimizer: 'adamw' | 'adam' | 'prodigy' | 'adamw8bit'
}

const defaultTrainingParams: TrainingParams = {
  steps: 2000,
  loraRank: 32,
  batchSize: 1,
  learningRate: 0.0001,
  optimizer: 'adamw'
}

export function ImageUpload() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [showUploader, setShowUploader] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('pending')
  const [loraName, setLoraName] = useState('')
  const [trainingParams, setTrainingParams] = useState<TrainingParams>(defaultTrainingParams)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkTrainingStatus = async () => {
      if (!supabase) return;
  
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Session error:", sessionError);
          return;
        }
        if (!session) {
          console.log("No active session");
          return;
        }
  
        // Fetching all active training statuses for the user
        const { data: trainings, error: trainingError } = await supabase
          .from('lora_training')
          .select('training_status')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
  
        if (trainingError || !trainings) {
          setTrainingStatus('pending');
          return;
        }
  
        // Check if any training has the status 'processing'
        const isProcessing = trainings.some(training => training.training_status === 'processing');
  
        // If any training is 'processing', set the status to 'processing', otherwise 'pending'
        if (isProcessing) {
          setTrainingStatus('processing');
        } else {
          setTrainingStatus('pending');
        }
      } catch (error) {
        console.error("Unexpected error in checkTrainingStatus:", error);
      }
    };
  
    checkTrainingStatus();
  
    const channel = supabase
      .channel('training_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lora_training',
        },
        (payload) => {
          if (payload.new && 'training_status' in payload.new) {
            setTrainingStatus(payload.new.training_status as TrainingStatus);
          }
        }
      )
      .subscribe();
  
    return () => {
      channel.unsubscribe();
    };
  }, [supabase]);
  

  const handleFilesSelected = (files: File[]) => {
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7),
      file
    }))

    setUploadedImages(prev => [...prev, ...newImages])
    setShowUploader(false)
  }

  const handleRemoveImage = (id: string) => {
    setUploadedImages(prev => {
      return prev.filter(img => {
        if (img.id === id && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url)
        }
        return img.id !== id
      })
    })
  }

  const handleTrainImages = async () => {
    if (!loraName.trim()) {
      toast({
        title: "LoRA name required",
        description: "Please enter a name for your LoRA model",
        variant: "destructive",
      })
      return
    }

    if (uploadedImages.length < 10 || uploadedImages.length > 25) {
      toast({
        title: "Invalid number of images",
        description: "Please upload between 10 and 25 images",
        variant: "destructive",
      })
      return
    }

    if (trainingStatus === 'processing') {
      toast({
        title: "Training in progress",
        description: "Please wait for the current training to complete",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      // Check if any previous training is still processing
      const { data: previousTrainingData } = await supabase
        .from('lora_training')
        .select('training_status')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (previousTrainingData && previousTrainingData.training_status === 'processing') {
        toast({
          title: "Training already in progress",
          description: "Please wait until the current training process finishes.",
          variant: "destructive",
        });
        return;
      }

      // Create ZIP file
      const zip = new JSZip()
      uploadedImages.forEach((image, index) => {
        zip.file(`image_${index + 1}${image.file.name.substring(image.file.name.lastIndexOf('.'))}`, image.file)
      })
      
      const zipBlob = await zip.generateAsync({ type: "blob" })
      const zipFile = new File([zipBlob], `${loraName}_dataset.zip`, { type: "application/zip" })

      const { data, error } = await supabase.storage.listBuckets();
      if (error) console.error("Error listing buckets:", error);

      const filePath = `users/${session.user.id}/datasets/${zipFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('images') // Ensure 'images' is your actual bucket name
        .upload(filePath, zipFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const storedFilePath = filePath // Store the file path, NOT signed URL

      const { error: trainingError } = await supabase
        .from('lora_training')
        .insert({
          user_id: session.user.id,
          lora_name: loraName,
          training_params: trainingParams,
          input_files: storedFilePath, // Store file path, NOT signed URL
          training_status: 'processing'
        } as any)

      if (trainingError) throw trainingError

      uploadedImages.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url)
        }
      })

      toast({
        title: "Training started",
        description: "Your model is now being trained",
      })

      // Reload the page to block new training requests
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start training. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {trainingStatus === 'processing' ? (
        <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800">
          <p className="font-medium">Training in Progress</p>
          <p className="text-sm">Your model is currently being trained. This may take several minutes.</p>
        </div>
      ) : (
        <>
          {showUploader ? (
            <FileUpload 
              onUploadComplete={handleFilesSelected} 
            />
          ) : (
            <Button
              onClick={() => setShowUploader(true)}
              className="w-full h-24"
              variant="outline"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Images
            </Button>
          )}
          
          {uploadedImages.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uploadedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.url}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>

              {uploadedImages.length >= 10 && uploadedImages.length <= 25 && (
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LoRA Name</label>
                    <Input
                      value={loraName}
                      onChange={(e) => setLoraName(e.target.value)}
                      placeholder="Enter a name for your LoRA model"
                    />
                  </div>
                  
                  <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Training Parameters</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Steps</label>
                         
                          <Input
                            type="number"
                            value={trainingParams.steps}
                            onChange={(e) => setTrainingParams({ ...trainingParams, steps: Number(e.target.value) })}
                            min="1000"
                            max="10000"
                          />

                          <label className="text-sm font-medium">LoRA Rank</label>
                          <Input
                            type="number"
                            value={trainingParams.loraRank}
                            onChange={(e) => setTrainingParams({ ...trainingParams, loraRank: Number(e.target.value) })}
                            min="1"
                            max="64"
                          />

                          <label className="text-sm font-medium">Batch Size</label>
                          <Input
                            type="number"
                            value={trainingParams.batchSize}
                            onChange={(e) => setTrainingParams({ ...trainingParams, batchSize: Number(e.target.value) })}
                            min="1"
                            max="8"
                          />

                          <label className="text-sm font-medium">Learning Rate</label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={trainingParams.learningRate}
                            onChange={(e) => setTrainingParams({ ...trainingParams, learningRate: Number(e.target.value) })}
                            min="0.0001"
                            max="0.01"
                          />

                          <label className="text-sm font-medium">Optimizer</label>
                          <Select
                            value={trainingParams.optimizer}
                            onValueChange={(value) => setTrainingParams({ ...trainingParams, optimizer: value as 'adamw' | 'adam' | 'prodigy' | 'adamw8bit' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Optimizer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adamw">AdamW</SelectItem>
                              <SelectItem value="adam">Adam</SelectItem>
                              <SelectItem value="prodigy">Prodigy</SelectItem>
                              <SelectItem value="adamw8bit">AdamW 8-bit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Button
                    onClick={handleTrainImages}
                    disabled={isUploading}
                    className="w-full mt-4"
                  >
                    {isUploading ? "Training in progress..." : "Start Training"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
