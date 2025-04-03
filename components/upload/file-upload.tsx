"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  disabled?: boolean
  onUploadComplete?: (files: File[]) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"]
const MIN_DIMENSIONS = { width: 1024, height: 1024 }

export function FileUpload({ disabled = false, onUploadComplete }: FileUploadProps) {
  const { toast } = useToast()

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        resolve(img.width >= MIN_DIMENSIONS.width && img.height >= MIN_DIMENSIONS.height)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        resolve(false)
      }
    })
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} is too large (max 5MB)`)
        continue
      }

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name} is not a JPG or PNG file`)
        continue
      }

      const isValidDimensions = await validateImage(file)
      if (!isValidDimensions) {
        errors.push(`${file.name} must be at least 1024x1024 pixels`)
        continue
      }

      validFiles.push(file)
    }

    if (errors.length > 0) {
      toast({
        title: "Some files were not added",
        description: errors.join('\n'),
        variant: "destructive",
      })
    }

    if (validFiles.length > 0) {
      onUploadComplete?.(validFiles)
    }
  }, [toast, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: true,
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5"}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <Plus className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Click to add more images, or drag & drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG or PNG, max 5MB, minimum 1024x1024 pixels
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}