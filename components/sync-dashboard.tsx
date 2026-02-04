"use client"

import { useEffect, useState, useCallback } from "react"
import { offlineManager } from "@/lib/offline-manager"
import type { ConnectionStatus } from "@/lib/offline-manager"
import SyncLogsViewer from "./sync-logs-viewer"
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueRetry,
  markPendudukAsSynced,
  savePendudukFromServer,
  getSyncQueueCount,
  getAuthLocal,
  type SyncQueueItem,
} from "@/lib/local-db"

interface SyncStatus {
  pending_sync_count: number
  unsynced_records: number
  last_sync_time: string | null
}

interface SyncConflict {
  recordId: number
  table: string
  localHash: string
  remoteHash: string
  action: string
  resolvedBy: string
}

interface SyncResult {
  successful: number
  failed: number
  conflicts: number
}

export default function SyncDashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncMessage, setSyncMessage] = useState("")
  const [error, setError] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([])
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([])
  const [isOnline, setIsOnline] = useState(true)

  // Check online status
  useEffect(() => {
    setIsOnline(navigator.onLine)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // ================= FETCH LOCAL STATUS =================
  const fetchLocalStatus = useCallback(async () => {
    try {
      const queue = await getSyncQueue()
      setPendingItems(queue)
      
      const count = await getSyncQueueCount()
      setStatus(prev => ({
        ...prev,
        pending_sync_count: count,
        unsynced_records: count,
        last_sync_time: prev?.last_sync_time || null,
      }))
    } catch (err) {
      console.error("Fetch local status error:", err)
    }
  }, [])

  // ================= FETCH SERVER STATUS =================
  const fetchServerStatus = useCallback(async () => {
    if (!isOnline) return
    
    try {
      const response = await fetch("/api/sync/status", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(prev => ({
          ...data.data,
          pending_sync_count: prev?.pending_sync_count || 0,
        }))
      }
    } catch (err) {
      console.error("Fetch server status error:", err)
    }
  }, [isOnline])

  useEffect(() => {
    fetchLocalStatus()
    fetchServerStatus()
    setLoading(false)

    if (offlineManager) {
      setConnectionStatus(offlineManager.getConnectionStatus())
      const unsubscribe = offlineManager.onStatusChange((newStatus) => {
        setConnectionStatus(newStatus)
      })
      return unsubscribe
    }
  }, [fetchLocalStatus, fetchServerStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLocalStatus()
      if (isOnline) fetchServerStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchLocalStatus, fetchServerStatus, isOnline])

  // ================= GET AUTH TOKEN =================
  const getToken = async (): Promise<string | null> => {
    // Try cookie first
    const cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1]
    
    if (cookieToken) return cookieToken
    
    // Try IndexedDB
    const authData = await getAuthLocal()
    return authData?.token || null
  }

  // ================= PUSH DATA TO SERVER =================
  const handlePush = async () => {
    if (!isOnline) {
      setError("Tidak dapat melakukan push dalam mode offline")
      return
    }

    setSyncing(true)
    setError("")
    setSyncMessage("")

    try {
      const token = await getToken()
      if (!token) {
        setError("Token tidak ditemukan. Silakan login ulang.")
        setSyncing(false)
        return
      }

      const queue = await getSyncQueue()
      
      if (queue.length === 0) {
        setSyncMessage("Tidak ada data yang perlu disinkronkan")
        setSyncing(false)
        return
      }

      const results: SyncResult = {
        successful: 0,
        failed: 0,
        conflicts: 0,
      }

      const conflicts: SyncConflict[] = []

      // Process each item in the queue
      for (const item of queue) {
        try {
          const response = await fetch("/api/sync/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({
              changes: [{
                table: item.table,
                action: item.action,
                data: {
                  ...item.data,
                  _id: item.server_id,
                },
              }],
              conflictResolution: "timestamp",
            }),
          })

          if (response.ok) {
            const data = await response.json()
            
            if (data.success) {
              results.successful++
              
              // Mark local item as synced
              if (item.action === "CREATE" && data.results?.successful > 0) {
                // Get the server ID from the response if available
                const serverId = data.insertedId || item.server_id || ""
                await markPendudukAsSynced(item.local_id, serverId)
              }
              
              // Remove from sync queue
              await removeSyncQueueItem(item.queue_id!)
              
              // Handle conflicts
              if (data.conflicts && data.conflicts.length > 0) {
                conflicts.push(...data.conflicts)
                results.conflicts += data.conflicts.length
              }
            } else {
              results.failed++
              await updateSyncQueueRetry(item.queue_id!, data.error || "Unknown error")
            }
          } else {
            results.failed++
            const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
            await updateSyncQueueRetry(item.queue_id!, errorData.error)
          }
        } catch (itemError) {
          results.failed++
          await updateSyncQueueRetry(
            item.queue_id!, 
            itemError instanceof Error ? itemError.message : "Network error"
          )
        }
      }

      // Update status message
      if (results.failed === 0 && results.conflicts === 0) {
        setSyncMessage(`Push berhasil! ${results.successful} data tersinkronkan ke server.`)
      } else if (results.conflicts > 0) {
        setSyncConflicts(conflicts)
        setSyncMessage(
          `Push selesai. ${results.successful} berhasil, ${results.conflicts} konflik, ${results.failed} gagal.`
        )
      } else {
        setSyncMessage(
          `Push selesai dengan error. ${results.successful} berhasil, ${results.failed} gagal.`
        )
      }

      // Refresh status
      await fetchLocalStatus()
      await fetchServerStatus()

    } catch (err) {
      console.error("Push error:", err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setSyncing(false)
    }
  }

  // ================= PULL DATA FROM SERVER =================
  const handlePull = async () => {
    if (!isOnline) {
      setError("Tidak dapat melakukan pull dalam mode offline")
      return
    }

    setSyncing(true)
    setError("")
    setSyncMessage("")

    try {
      const response = await fetch("/api/sync/pull", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          tables: ["penduduk"],
          lastSyncTime: status?.last_sync_time || null,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }))
        setError(`Pull gagal: ${err.error}`)
        return
      }

      const data = await response.json()
      
      // Save pulled data to IndexedDB
      if (data.data?.penduduk && Array.isArray(data.data.penduduk)) {
        await savePendudukFromServer(data.data.penduduk)
      }

      const pendudukCount = data.data?.penduduk?.length || 0
      setSyncMessage(`Pull berhasil! ${pendudukCount} data penduduk diperbarui.`)

      // Update status
      setStatus(prev => ({
        ...prev!,
        last_sync_time: new Date().toISOString(),
      }))

      await fetchLocalStatus()

    } catch (err) {
      console.error("Pull error:", err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : "Unknown error"}`)
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
      {/* Connection Status */}
      <div className={`p-4 rounded-lg border ${
        isOnline 
          ? "bg-green-50 border-green-200 text-green-700" 
          : "bg-yellow-50 border-yellow-200 text-yellow-700"
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"}`} />
          <span className="font-medium">
            {isOnline ? "Online - Siap sinkronisasi" : "Offline - Data tersimpan lokal"}
          </span>
        </div>
        {!isOnline && (
          <p className="mt-2 text-sm">
            Data yang diinput akan disimpan di perangkat dan disinkronkan saat online.
          </p>
        )}
      </div>

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

      {/* Pending Sync Summary */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-bold mb-4">Status Sinkronisasi</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600">Data Menunggu Push</p>
            <p className="text-2xl font-bold text-blue-800">{pendingItems.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600">Terakhir Sinkronisasi</p>
            <p className="text-sm font-medium text-green-800">
              {status?.last_sync_time 
                ? new Date(status.last_sync_time).toLocaleString("id-ID")
                : "Belum pernah"
              }
            </p>
          </div>
        </div>

        {/* Pending Items Detail */}
        {pendingItems.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Data yang akan disinkronkan:</h4>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Tabel</th>
                    <th className="px-3 py-2 text-left">Aksi</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingItems.map((item) => (
                    <tr key={item.queue_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{item.table}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.action === "CREATE" ? "bg-green-100 text-green-700" :
                          item.action === "UPDATE" ? "bg-blue-100 text-blue-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 truncate max-w-xs">
                        {item.data?.nama || item.data?.nik || "N/A"}
                      </td>
                      <td className="px-3 py-2">
                        {item.retry_count > 0 ? (
                          <span className="text-yellow-600 text-xs">
                            Retry: {item.retry_count}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sync Controls */}
        <div className="flex gap-4">
          <button
            onClick={handlePull}
            disabled={syncing || !isOnline}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {syncing ? "Memproses..." : "Pull Data dari Server"}
          </button>

          <button
            onClick={handlePush}
            disabled={syncing || !isOnline || pendingItems.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {syncing ? "Memproses..." : `Push Data ke Server (${pendingItems.length})`}
          </button>
        </div>

        {!isOnline && (
          <p className="mt-4 text-sm text-yellow-600 text-center">
            Sinkronisasi tidak tersedia dalam mode offline. Hubungkan ke internet untuk menyinkronkan data.
          </p>
        )}
      </div>

      {/* Conflicts Display */}
      {syncConflicts.length > 0 && (
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-bold text-yellow-800 mb-4">Konflik Sinkronisasi</h3>
          <div className="space-y-2">
            {syncConflicts.map((conflict, index) => (
              <div key={index} className="bg-white p-3 rounded border border-yellow-300">
                <p className="text-sm">
                  <strong>Tabel:</strong> {conflict.table} | 
                  <strong> Aksi:</strong> {conflict.action} | 
                  <strong> Resolusi:</strong> {conflict.resolvedBy}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <SyncLogsViewer />
    </div>
  )
}
