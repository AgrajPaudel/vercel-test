import { ImageUpload } from "@/components/upload/image-upload"

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Upload Images</h2>
      </div>
      <div className="grid gap-4">
        <ImageUpload />
      </div>
    </div>
  )
}