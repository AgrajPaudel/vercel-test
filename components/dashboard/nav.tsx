"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ImageIcon, CreditCard, Wand2 } from "lucide-react"

const navItems = [
  {
    title: "Upload Images",
    href: "/dashboard",
    icon: ImageIcon,
  },
  {
    title: "Generate",
    href: "/dashboard/generate",
    icon: Wand2,
  },
  {
    title: "Subscription",
    href: "/dashboard/subscription",
    icon: CreditCard,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="grid gap-2">
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "default" : "ghost"}
          className="w-full justify-start"
          asChild
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Link>
        </Button>
      ))}
    </nav>
  )
}