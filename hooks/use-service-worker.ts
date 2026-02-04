"use client"

import { useEffect, useState, useCallback } from "react"

interface ServiceWorkerState {
  isRegistered: boolean
  isUpdateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
  })

  const updateServiceWorker = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" })
      window.location.reload()
    }
  }, [state.registration])

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        })

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }))

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setState(prev => ({
                  ...prev,
                  isUpdateAvailable: true,
                }))
              }
            })
          }
        })

        // Check for waiting worker on load
        if (registration.waiting) {
          setState(prev => ({
            ...prev,
            isUpdateAvailable: true,
          }))
        }
      } catch (error) {
        console.error("Service Worker registration failed:", error)
      }
    }

    registerServiceWorker()

    // Handle controller change (new SW activated)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload()
    })
  }, [])

  return {
    ...state,
    updateServiceWorker,
  }
}
