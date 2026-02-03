"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = document.cookie.split("; ").find((row) => row.startsWith("token="))
    if (token) {
      router.push("/app/dashboard")
    } else {
      router.push("/login")
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Memproses...</p>
      </div>
    </div>
  )
}
