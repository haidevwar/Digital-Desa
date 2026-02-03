"use client"

import { useEffect, useState } from "react"
import PendudukTable from "@/components/penduduk-table"
import PendudukForm from "@/components/penduduk-form"

export default function PendudukPage() {
  const [pendudukList, setPendudukList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string>("")

  const fetchPenduduk = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch("/api/penduduk", {
        method: "GET",
        credentials: "include", // WAJIB agar cookie terkirim
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || "Gagal mengambil data")
        return
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setPendudukList(data.data)
      } else {
        setError("Format data tidak sesuai")
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Terjadi kesalahan"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPenduduk()
  }, [])

  const handleFormClose = () => {
    setShowForm(false)
    setEditingId(null)
    fetchPenduduk()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-text">Data Penduduk</h2>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <PendudukForm editingId={editingId} onClose={handleFormClose} />
        </div>
      )}

      <PendudukTable
        penduduk={pendudukList}
        loading={loading}
        onEdit={(id) => {
          setEditingId(id)
          setShowForm(true)
        }}
        onDelete={fetchPenduduk}
      />
    </div>
  )
}
