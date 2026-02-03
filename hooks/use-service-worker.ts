"use client"

import { useEffect } from "react"

export function useServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("[v0] Service Worker registered:", registration)
        })
        .catch((error) => {
          console.error("[v0] Service Worker registration failed:", error)
        })
    }
  }, [])
}
