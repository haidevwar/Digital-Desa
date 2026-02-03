"use client"

import { useEffect, useState, useRef } from "react"
import { useOfflineSync } from "@/hooks/use-offline-sync"
import { offlineManager, type ConnectionStatus } from "@/lib/offline-manager"

interface Toast {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message: string
  autoClose: boolean
}

export default function SyncToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { lastSyncResult, syncError } = useOfflineSync()
  const prevConnectionStatus = useRef<ConnectionStatus | null>(null)

  // ================= SYNC RESULT =================
  useEffect(() => {
    if (lastSyncResult) {
      addToast({
        type: lastSyncResult.success ? "success" : "warning",
        title: lastSyncResult.success
          ? "Sinkronisasi Berhasil"
          : "Sinkronisasi dengan Warning",
        message: lastSyncResult.message,
        autoClose: true,
      })
    }

    if (syncError) {
      addToast({
        type: "error",
        title: "Sync Error",
        message: syncError,
        autoClose: true,
      })
    }
  }, [lastSyncResult, syncError])

  // ================= CONNECTION MONITOR =================
  useEffect(() => {
    if (!offlineManager) return

    const unsubscribe = offlineManager.onStatusChange(
      (status: ConnectionStatus) => {
        const previous = prevConnectionStatus.current

        if (previous && previous.isOnline !== status.isOnline) {
          if (status.isOnline) {
            addToast({
              type: "success",
              title: "Kembali Online",
              message:
                "Koneksi telah dipulihkan. Sinkronisasi otomatis akan dimulai.",
              autoClose: true,
            })
          } else {
            addToast({
              type: "warning",
              title: "Mode Offline",
              message:
                "Anda sedang offline. Perubahan akan disimpan dan disinkronkan saat online.",
              autoClose: false,
            })
          }
        }

        prevConnectionStatus.current = status
      }
    )

    return unsubscribe
  }, [])

  // ================= TOAST HANDLER =================
  const addToast = (toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { ...toast, id }

    setToasts((prev) => [...prev, newToast])

    if (toast.autoClose) {
      setTimeout(() => {
        removeToast(id)
      }, 4000)
    }
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-40 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg border flex items-start gap-3 ${
            toast.type === "success"
              ? "bg-success bg-opacity-10 border-success text-success"
              : toast.type === "error"
              ? "bg-danger bg-opacity-10 border-danger text-danger"
              : toast.type === "warning"
              ? "bg-warning bg-opacity-10 border-warning text-warning"
              : "bg-info bg-opacity-10 border-info text-info"
          }`}
        >
          <div className="flex-1">
            <p className="font-medium text-sm">{toast.title}</p>
            <p className="text-xs mt-1 opacity-90">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
