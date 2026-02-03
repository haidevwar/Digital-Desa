"use client"

import { useEffect, useState, useCallback } from "react"
import type { OfflineChange } from "@/lib/offline-manager"
import { offlineManager } from "@/lib/offline-manager"

interface SyncResult {
  success: boolean
  processed: number
  failed: number
  message: string
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingChanges, setPendingChanges] = useState<OfflineChange[]>([])
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Check initial online status
    setIsOnline(offlineManager?.isApplicationOnline() ?? true)

    // Listen for sync ready events
    const handleSyncReady = async (e: any) => {
      console.log("[v0] Sync ready event received with", e.detail.changes?.length || 0, "changes")
      setPendingChanges(e.detail.changes || [])
      await performSync(e.detail.changes || [])
    }

    window.addEventListener("offline-sync-ready", handleSyncReady)
    window.addEventListener("online", () => {
      console.log("[v0] Online event detected in hook")
      setIsOnline(true)
      setSyncError(null)
    })
    window.addEventListener("offline", () => {
      console.log("[v0] Offline event detected in hook")
      setIsOnline(false)
    })

    return () => {
      window.removeEventListener("offline-sync-ready", handleSyncReady)
      window.removeEventListener("online", () => setIsOnline(true))
      window.removeEventListener("offline", () => setIsOnline(false))
    }
  }, [])

  const performSync = useCallback(
    async (changes: OfflineChange[]) => {
      if (!isOnline || changes.length === 0) {
        console.log("[v0] Cannot sync: isOnline =", isOnline, "changes =", changes.length)
        return
      }

      setSyncing(true)
      setSyncError(null)
      let processed = 0
      let failed = 0

      try {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("token="))
          ?.split("=")[1]

        if (!token) {
          setSyncError("Token tidak ditemukan")
          setSyncing(false)
          return
        }

        // Group changes by table
        const changesByTable = changes.reduce(
          (acc, change) => {
            if (!acc[change.table]) acc[change.table] = []
            acc[change.table].push(change)
            return acc
          },
          {} as Record<string, OfflineChange[]>,
        )

        // Push each table's changes
        for (const [table, tableChanges] of Object.entries(changesByTable)) {
          const syncChanges = tableChanges.map((change) => ({
            table,
            action: change.action,
            data: change.data,
          }))

          try {
            const response = await fetch("/api/sync/push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ changes: syncChanges, conflictResolution: "timestamp" }),
            })

            if (response.ok) {
              const result = await response.json()
              console.log("[v0] Successfully synced", table, "result:", result)
              processed += result.results?.successful || 0
              failed += result.results?.failed || 0
              // Clear synced changes from queue
              setPendingChanges((prev) => prev.filter((c) => c.table !== table))
            } else {
              console.error("[v0] Failed to sync", table, "status:", response.status)
              failed += tableChanges.length
            }
          } catch (tableError) {
            console.error("[v0] Table sync error:", tableError)
            failed += tableChanges.length
          }
        }

        const result: SyncResult = {
          success: failed === 0,
          processed,
          failed,
          message: failed === 0 ? `Sync berhasil! ${processed} item tersinkronisasi` : `Sync selesai dengan ${failed} error`,
        }

        setLastSyncResult(result)
        setRetryCount(0)

        if (!result.success) {
          // Trigger retry with backoff
          console.log("[v0] Some items failed, triggering retry")
          offlineManager?.retrySyncWithBackoff()
          setRetryCount((prev) => prev + 1)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown sync error"
        console.error("[v0] Sync error:", error)
        setSyncError(errorMsg)
        setLastSyncResult({ success: false, processed: 0, failed: changes.length, message: errorMsg })

        // Trigger retry if online
        if (isOnline) {
          offlineManager?.retrySyncWithBackoff()
          setRetryCount((prev) => prev + 1)
        }
      } finally {
        setSyncing(false)
      }
    },
    [isOnline],
  )

  return {
    isOnline,
    pendingChanges,
    syncing,
    lastSyncResult,
    syncError,
    retryCount,
    performSync,
  }
}
