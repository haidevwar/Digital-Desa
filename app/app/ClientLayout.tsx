"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useServiceWorker } from "@/hooks/use-service-worker"
import { useOfflineSync } from "@/hooks/use-offline-sync"
import { useSyncNotifications } from "@/hooks/use-sync-notifications"
import ConnectivityIndicator from "@/components/connectivity-indicator"
import SyncToast from "@/components/sync-toast"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useServiceWorker()
  useSyncNotifications()

  const { isOnline, pendingChanges, syncing } = useOfflineSync()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        })

        if (!res.ok) {
          router.push("/login")
          return
        }

        const data = await res.json()
        setUser(data.user)
      } catch (error) {
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      router.push("/login")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Memproses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-surface">
      <ConnectivityIndicator />
      <SyncToast />

      {/* Sidebar */}
      <div className="w-64 bg-neutral-900 text-white shadow-lg">
        <div className="p-6 border-b border-neutral-700">
          <h1 className="text-2xl font-bold">Digital Desa</h1>
          <p className="text-sm text-neutral-400 mt-1">Manajemen Data Desa</p>

          <div className="mt-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"}`}></div>
            <span className="text-xs text-neutral-400">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <nav className="mt-8 space-y-2 px-4">
          <Link
            href="/app/dashboard"
            className={`block px-4 py-3 rounded-lg transition ${
              pathname === "/app/dashboard"
                ? "bg-primary text-white"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/app/penduduk"
            className={`block px-4 py-3 rounded-lg transition ${
              pathname === "/app/penduduk"
                ? "bg-primary text-white"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Data Penduduk
          </Link>

          <Link
            href="/app/sync"
            className={`block px-4 py-3 rounded-lg transition ${
              pathname === "/app/sync"
                ? "bg-primary text-white"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Sinkronisasi
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t border-neutral-700 bg-neutral-800 space-y-4">
          {pendingChanges.length > 0 && (
            <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded p-3">
              <p className="text-xs text-yellow-400 font-medium">
                {pendingChanges.length} changes pending sync
              </p>
              {syncing && (
                <p className="text-xs text-yellow-300 mt-1">
                  Syncing...
                </p>
              )}
            </div>
          )}

          <div className="text-sm">
            <p className="text-neutral-400">User</p>
            <p className="text-white font-medium">
              {user?.namaLengkap || "User"}
            </p>
            <p className="text-xs text-neutral-400">
              {user?.role}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-background border-b border-border shadow-sm">
          <div className="px-8 py-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-text">
              {pathname === "/app/dashboard" && "Dashboard"}
              {pathname === "/app/penduduk" && "Data Penduduk"}
              {pathname === "/app/sync" && "Sinkronisasi Data"}
            </h2>

            {!isOnline && (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                Offline Mode
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
