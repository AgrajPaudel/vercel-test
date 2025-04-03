"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SubscriptionPage() {
  const router = useRouter()

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Subscription</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Free Trial</p>
                <p className="text-sm text-muted-foreground">10 images per month</p>
              </div>
              <Button onClick={() => router.push("/pricing")}>
                Upgrade Plan
              </Button>
            </div>
            <div>
              <p className="font-medium">Usage This Month</p>
              <p className="text-sm text-muted-foreground">0 / 10 images generated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}