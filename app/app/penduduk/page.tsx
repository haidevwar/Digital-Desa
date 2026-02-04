"use client"

import { useEffect, useState, useCallback } from "react"
import PendudukTable from "@/components/penduduk-table"
import PendudukForm from "@/components/penduduk-form"
import { 
  getAllPendudukLocal, 
  savePendudukFromServer, 
  getSyncQueueCount,
  deletePendudukLocal,
  type LocalPenduduk 
} from "@/lib/local-db"

export default function PendudukPage() {
  const [pendudukList, setPendudukList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string>("")
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

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

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await getSyncQueueCount()
    setPendingCount(count)
  }, [])

  const fetchPenduduk = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      // Always get local data first
      const localData = await getAllPendudukLocal()
      
      if (isOnline) {
        try {
          const response = await fetch("/api/penduduk", {
            method: "GET",
            credentials: "include",
          })

          if (response.ok) {
            const data = await response.json()

            if (data.success && Array.isArray(data.data)) {
              // Save server data to IndexedDB
              await savePendudukFromServer(data.data)
              
              // Get merged data from IndexedDB
              const mergedData = await getAllPendudukLocal()
              setPendudukList(mergedData.map((item: LocalPenduduk, index: number) => ({
                ...item,
                id: item.local_id || index,
                _id: item.server_id,
              })))
            }
          } else {
            // Server error but we have local data
            if (localData.length > 0) {
              setPendudukList(localData.map((item: LocalPenduduk, index: number) => ({
                ...item,
                id: item.local_id || index,
                _id: item.server_id,
              })))
            } else {
              const errorData = await response.json()
              setError(errorData.error || "Gagal mengambil data")
            }
          }
        } catch (fetchError) {
          // Network error, use local data
          if (localData.length > 0) {
            setPendudukList(localData.map((item: LocalPenduduk, index: number) => ({
              ...item,
              id: item.local_id || index,
              _id: item.server_id,
            })))
          } else {
            setError("Gagal terhubung ke server. Tidak ada data lokal.")
          }
        }
      } else {
        // Offline mode - use local data only
        if (localData.length > 0) {
          setPendudukList(localData.map((item: LocalPenduduk, index: number) => ({
            ...item,
            id: item.local_id || index,
            _id: item.server_id,
          })))
        } else {
          setError("Mode offline. Tidak ada data tersimpan lokal.")
        }
      }
      
      await updatePendingCount()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Terjadi kesalahan"
      )
    } finally {
      setLoading(false)
    }
  }, [isOnline, updatePendingCount])

  useEffect(() => {
    fetchPenduduk()
  }, [fetchPenduduk])

  const handleFormClose = () => {
    setShowForm(false)
    setEditingId(null)
    fetchPenduduk()
  }

  const handleDelete = async (id: number) => {
    try {
      // Delete from IndexedDB
      await deletePendudukLocal(id)
      
      // If online, also delete from server
      if (isOnline) {
        const item = pendudukList.find(p => p.id === id || p.local_id === id)
        if (item?.server_id || item?._id) {
          try {
            await fetch(`/api/penduduk/${item.server_id || item._id}`, {
              method: "DELETE",
              credentials: "include",
            })
          } catch {
            // Server delete failed but local delete succeeded
          }
        }
      }
      
      fetchPenduduk()
    } catch (error) {
      console.error("Delete error:", error)
      setError("Gagal menghapus data")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text">Data Penduduk</h2>
          <div className="flex items-center gap-4 mt-2">
            <div className={`flex items-center gap-2 text-sm ${isOnline ? "text-green-600" : "text-yellow-600"}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"}`} />
              {isOnline ? "Online" : "Offline Mode"}
            </div>
            {pendingCount > 0 && (
              <div className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                {pendingCount} data menunggu sinkronisasi
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(true)
          }}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg transition font-medium"
        >
          Tambah Penduduk
        </button>
      </div>

      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          Mode offline aktif. Data yang diinput akan disimpan secara lokal dan disinkronkan saat online.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <PendudukForm editingId={editingId} onClose={handleFormClose} isOfflineMode={!isOnline} />
        </div>
      )}

      <PendudukTable
        penduduk={pendudukList}
        loading={loading}
        onEdit={(id) => {
          setEditingId(id)
          setShowForm(true)
        }}
        onDelete={handleDelete}
      />
    </div>
  )
}
