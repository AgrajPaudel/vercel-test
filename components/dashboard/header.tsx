"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { LogOut } from "lucide-react"

export function DashboardHeader() {
  const router = useRouter()
  const { toast } = useToast()

  const handleSignOut = async () => {
    const supabase = createClient()
    try {
      await supabase.auth.signOut()
      router.push('/auth/signin')
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <h2 className="text-lg font-semibold">AI Image Generator</h2>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </header>
  )
}