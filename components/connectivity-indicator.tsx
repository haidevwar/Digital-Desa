"use client"

import { useEffect, useState } from "react"
import { offlineManager, type ConnectionStatus } from "@/lib/offline-manager"

export default function ConnectivityIndicator() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!offlineManager) return

    // Get initial status
    setStatus(offlineManager.getConnectionStatus())

    // Subscribe to status changes
    const unsubscribe = offlineManager.onStatusChange((newStatus) => {
      setStatus(newStatus)
    })

    return unsubscribe
  }, [])

  if (!status) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all cursor-pointer
          ${
            status.isOnline
              ? "bg-success bg-opacity-90 text-white"
              : "bg-danger bg-opacity-90 text-white animate-pulse"
          }
        `}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div
          className={`
            w-2 h-2 rounded-full
            ${status.isOnline ? "bg-white" : "bg-red-200"}
          `}
        />
        <span className="text-sm font-medium">{status.isOnline ? "Online" : "Offline"}</span>
      </div>

      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 bg-background border border-border rounded-lg shadow-xl p-3 w-72 text-white">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-text-secondary">Status:</span>
              <span className={status.isOnline ? "text-success font-medium" : "text-white font-medium"}>
                {status.isOnline ? "Connected" : "Disconnected"}
              </span>
            </div>

            {status.lastOnlineTime && (
              <div className="flex justify-between">
                <span className="text-text-secondary text-white">Last Connected:</span>
                <span className="text-text font-mono text-xs">
                  {status.lastOnlineTime.toLocaleTimeString("id-ID")}
                </span>
              </div>
            )}

            {!status.isOnline && status.connectionLost && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Retry Attempt:</span>
                <span className="text-warning font-medium">{status.retryCount}/5</span>
              </div>
            )}

            {!status.isOnline && (
              <div className="mt-3 p-2 bg-warning bg-opacity-10 border border-warning rounded text-warning text-xs text-white">
                Changes akan tersimpan offline dan otomatis tersinkronisasi saat terhubung kembali.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
  