"use client"

import { useEffect } from "react"
import type { ConnectionStatus } from "@/lib/offline-manager"
import { offlineManager } from "@/lib/offline-manager"

export const useSyncNotifications = () => {
  useEffect(() => {
    if (!("Notification" in window)) return

    if (Notification.permission === "default") {
      Notification.requestPermission()
    }

    const handleSyncReady = (e: any) => {
      if (e.detail?.changes?.length > 0) {
        sendNotification({
          title: "Sinkronisasi Data",
          message: `Sinkronisasi ${e.detail.changes.length} perubahan dimulai`,
          type: "info",
        })
      }
    }

    const unsubscribe = offlineManager.onStatusChange(
      (status: ConnectionStatus) => {
        if (!status.isOnline) {
          sendNotification({
            title: "Mode Offline",
            message:
              "Anda sedang offline. Perubahan akan disimpan dan tersinkronisasi otomatis.",
            type: "warning",
          })
        } else if (status.connectionLost) {
          sendNotification({
            title: "Kembali Online",
            message:
              "Koneksi telah dipulihkan. Memulai sinkronisasi...",
            type: "success",
          })
        }
      }
    )

    window.addEventListener("offline-sync-ready", handleSyncReady)

    return () => {
      unsubscribe()
      window.removeEventListener("offline-sync-ready", handleSyncReady)
    }
  }, [])
}

function sendNotification(options: {
  title: string
  message: string
  type: "success" | "error" | "warning" | "info"
}) {
  if (Notification.permission !== "granted") return

  const notification = new Notification(options.title, {
    body: options.message,
    icon: "/icon-192x192.png",
    tag: `sync-${Date.now()}`,
    requireInteraction: options.type === "error",
  })

  if (options.type !== "error") {
    setTimeout(() => notification.close(), 5000)
  }

  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}
