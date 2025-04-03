import { Button } from "@/components/ui/button"
import { ImageIcon } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-primary">
          AI Image Generation
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Create stunning, unique images with the power of artificial intelligence.
          Transform your ideas into visual masterpieces in seconds.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild size="lg">
            <Link href="/dashboard">
              <ImageIcon className="mr-2 h-4 w-4" />
              Start Creating
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}