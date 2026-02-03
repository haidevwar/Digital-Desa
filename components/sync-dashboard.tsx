"use client"

import { useEffect, useState } from "react"
import { offlineManager } from "@/lib/offline-manager"
import type { ConnectionStatus } from "@/lib/offline-manager"
import SyncLogsViewer from "./sync-logs-viewer"

interface SyncStatus {
  pending_sync_count: number
  unsynced_records: number
  last_sync_time: string | null
}

interface SyncLog {
  id: number
  user_id: number
  action: string
  tables_synced: string
  record_count: number
  is_successful: boolean
  synced_at: string
}

interface SyncConflict {
  recordId: number
  table: string
  localHash: string
  remoteHash: string
  action: string
  resolvedBy: string
}

export default function SyncDashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncMessage, setSyncMessage] = useState("")
  const [error, setError] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([])
  const [showConflicts, setShowConflicts] = useState(false)

  // ================= FETCH STATUS =================
  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/sync/status", {
        credentials: "include",
      })

      if (!response.ok) {
        let errorMessage = "Gagal mengambil status"

        try {
          const err = await response.json()
          errorMessage = err?.error || errorMessage
        } catch {
          errorMessage = response.statusText
        }

        setError(errorMessage)
        return
      }

      const data = await response.json()
      setStatus(data.data)
    } catch (err: any) {
      console.error("Fetch status error:", err)
      setError(err?.message || "Terjadi kesalahan saat mengambil status")
    }
  }

  const fetchLogs = async () => {
    try {
      setLogs([])
    } catch (err) {
      console.error("Fetch logs error:", err)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchLogs()
    setLoading(false)

    if (offlineManager) {
      setConnectionStatus(offlineManager.getConnectionStatus())
      const unsubscribe = offlineManager.onStatusChange((newStatus) => {
        setConnectionStatus(newStatus)
      })
      return unsubscribe
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  // ================= HANDLE SYNC =================
  const handleSync = async (type: "pull" | "push") => {
    setSyncing(true)
    setError("")
    setSyncMessage("")

    try {
      const response = await fetch(`/api/sync/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          tables: ["penduduk", "keluarga"],
          lastSyncTime: status?.last_sync_time || null,
        }),
      })

      if (!response.ok) {
        let errorMessage = "Unknown error"

        try {
          const err = await response.json()
          errorMessage = err?.error || errorMessage
          console.error(type, "sync error:", err)
        } catch {
          errorMessage = response.statusText
        }

        setError(`Sync gagal: ${errorMessage}`)

        if (!connectionStatus?.isOnline && offlineManager) {
          offlineManager.retrySyncWithBackoff()
        }

        return
      }

      const data = await response.json()

      if (type === "pull") {
        const pendudukCount = data.data?.penduduk?.length || 0
        const keluargaCount = data.data?.keluarga?.length || 0
        setSyncMessage(
          `Pull berhasil. Penduduk: ${pendudukCount}, Keluarga: ${keluargaCount}`
        )
      } else {
        const successful = data.results?.successful || 0
        const conflicts = data.results?.conflicts || 0

        if (conflicts > 0) {
          setSyncConflicts(data.conflicts || [])
          setShowConflicts(true)
          setSyncMessage(
            `Push selesai. ${successful} berhasil, ${conflicts} konflik`
          )
        } else {
          setSyncMessage(
            `Push berhasil. ${successful} record diproses`
          )
        }
      }

      fetchStatus()
      fetchLogs()
    } catch (err: any) {
      console.error("Sync error:", err)
      setError(`Terjadi kesalahan: ${err?.message || "Unknown error"}`)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {connectionStatus && !connectionStatus.isOnline && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 px-4 py-3 rounded-lg">
          Anda sedang offline. Data akan otomatis tersinkronisasi saat online.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {syncMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {syncMessage}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-bold mb-4">Kontrol Sinkronisasi</h3>

        <div className="flex gap-4">
          <button
            onClick={() => handleSync("pull")}
            disabled={syncing}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50"
          >
            {syncing ? "Processing..." : "Pull Data"}
          </button>

          <button
            onClick={() => handleSync("push")}
            disabled={syncing}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg disabled:opacity-50"
          >
            {syncing ? "Processing..." : "Push Data"}
          </button>
        </div>
      </div>

      <SyncLogsViewer />
    </div>
  )
}
