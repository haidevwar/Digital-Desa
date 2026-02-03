"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface SyncStatus {
  pending_sync_count: number
  unsynced_records: number
  last_sync_time: string | null
  is_syncing: boolean
}

export default function DashboardPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const response = await fetch("/api/sync/status", {
          credentials: "include", // otomatis kirim HttpOnly cookie
        })

        if (response.ok) {
          const data = await response.json()
          setSyncStatus(data.data)
        } else if (response.status === 401) {
          // kalau token invalid, redirect ke login
          window.location.href = "/login"
        }
      } catch (error) {
        console.error("Error fetching sync status:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSyncStatus()
    const interval = setInterval(fetchSyncStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background p-6 rounded-lg border border-border shadow-sm">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Status Sinkronisasi
          </h3>
          <p className="text-3xl font-bold text-primary">
            {loading
              ? "Loading..."
              : syncStatus?.is_syncing
              ? "Syncing..."
              : "Ready"}
          </p>
        </div>

        <div className="bg-background p-6 rounded-lg border border-border shadow-sm">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Pending Sync
          </h3>
          <p className="text-3xl font-bold text-warning">
            {syncStatus?.pending_sync_count ?? 0}
          </p>
        </div>

        <div className="bg-background p-6 rounded-lg border border-border shadow-sm">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Unsynced Records
          </h3>
          <p className="text-3xl font-bold text-info">
            {syncStatus?.unsynced_records ?? 0}
          </p>
        </div>

        <div className="bg-background p-6 rounded-lg border border-border shadow-sm">
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Last Sync
          </h3>
          <p className="text-sm font-mono text-text">
            {syncStatus?.last_sync_time
              ? new Date(syncStatus.last_sync_time).toLocaleTimeString("id-ID")
              : "Never"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background p-6 rounded-lg border border-border shadow-sm">
          <h3 className="text-lg font-bold text-text mb-4">
            Manajemen Data
          </h3>

          <div className="space-y-3">
            <Link
              href="/app/penduduk"
              className="block p-4 bg-primary bg-opacity-10 hover:bg-opacity-20 rounded-lg border border-primary border-opacity-30 transition"
            >
              <h4 className="font-medium text-white">Data Penduduk</h4>
              <p className="text-sm text-white mt-1">
                Kelola data penduduk dan keluarga
              </p>
            </Link>

            <Link
              href="/app/sync"
              className="block p-4 bg-success bg-opacity-10 hover:bg-opacity-20 rounded-lg border border-success border-opacity-30 transition"
            >
              <h4 className="font-medium text-white">Sinkronisasi Data</h4>
              <p className="text-sm text-white mt-1">
                Kelola sinkronisasi data offline-online
              </p>
            </Link>
          </div>
        </div>

        <div className="bg-background p-6 rounded-lg border border-border shadow-sm">
          <h3 className="text-lg font-bold text-text mb-4">
            Informasi Sistem
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Aplikasi:</span>
              <span className="font-medium">Digital Desa v1.0</span>
            </div>

            <div className="flex justify-between">
              <span className="text-text-secondary">Tipe Sinkronisasi:</span>
              <span className="font-medium">Flag-Based Sync</span>
            </div>

            <div className="flex justify-between">
              <span className="text-text-secondary">Algoritma Hashing:</span>
              <span className="font-medium">SHA-256</span>
            </div>

            <div className="flex justify-between">
              <span className="text-text-secondary">Status:</span>
              <span className="font-medium text-success">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
