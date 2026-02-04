"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { 
  addPendudukLocal, 
  updatePendudukLocal, 
  getPendudukByLocalId,
  type LocalPenduduk 
} from "@/lib/local-db"

interface Props {
  editingId: number | null
  onClose: () => void
  isOfflineMode?: boolean
}

export default function PendudukForm({ editingId, onClose, isOfflineMode = false }: Props) {
  const [formData, setFormData] = useState({
    nik: "",
    nama: "",
    tanggal_lahir: "",
    keluarga_id: "1",
    jenis_kelamin: "Laki-laki",
    agama: "Islam",
    status_kawin: "Belum Kawin",
    pekerjaan: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
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

  // ================= FETCH DATA SAAT EDIT =================
  useEffect(() => {
    if (!editingId) return

    const fetchData = async () => {
      try {
        // First try to get from IndexedDB
        const localData = await getPendudukByLocalId(editingId)
        
        if (localData) {
          setFormData({
            nik: localData.nik || "",
            nama: localData.nama || "",
            tanggal_lahir: localData.tanggal_lahir?.split("T")[0] || "",
            keluarga_id: localData.keluarga_id?.toString() || "1",
            jenis_kelamin: localData.jenis_kelamin || "Laki-laki",
            agama: localData.agama || "Islam",
            status_kawin: localData.status_kawin || "Belum Kawin",
            pekerjaan: localData.pekerjaan || "",
          })
          return
        }
        
        // If online and not found locally, try server
        if (isOnline && !isOfflineMode) {
          const response = await fetch(`/api/penduduk/${editingId}`, {
            method: "GET",
            credentials: "include",
          })

          if (!response.ok) {
            const err = await response.json()
            setError(err.error || "Gagal mengambil data")
            return
          }

          const data = await response.json()

          if (data.success) {
            setFormData({
              nik: data.data.nik || "",
              nama: data.data.nama || "",
              tanggal_lahir: data.data.tanggal_lahir?.split("T")[0] || "",
              keluarga_id: data.data.keluarga_id?.toString() || "1",
              jenis_kelamin: data.data.jenis_kelamin || "Laki-laki",
              agama: data.data.agama || "Islam",
              status_kawin: data.data.status_kawin || "Belum Kawin",
              pekerjaan: data.data.pekerjaan || "",
            })
          }
        } else {
          setError("Data tidak ditemukan di penyimpanan lokal")
        }
      } catch (err) {
        setError("Terjadi kesalahan saat mengambil data")
      }
    }

    fetchData()
  }, [editingId, isOnline, isOfflineMode])

  // ================= HANDLE CHANGE =================
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // ================= SAVE TO INDEXEDDB (OFFLINE) =================
  const saveToIndexedDB = async () => {
    if (editingId) {
      await updatePendudukLocal(editingId, formData)
    } else {
      await addPendudukLocal(formData)
    }
  }

  // ================= SAVE TO SERVER (ONLINE) =================
  const saveToServer = async () => {
    const url = editingId
      ? `/api/penduduk/${editingId}`
      : "/api/penduduk"

    const method = editingId ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || "Gagal menyimpan data")
    }

    return result
  }

  // ================= HANDLE SUBMIT =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validate NIK
      if (formData.nik.length !== 16) {
        setError("NIK harus 16 digit")
        setLoading(false)
        return
      }

      // Always save to IndexedDB first (offline-first approach)
      await saveToIndexedDB()
      
      // If online, also try to save to server
      if (isOnline && !isOfflineMode) {
        try {
          await saveToServer()
        } catch (serverError) {
          // Server save failed but local save succeeded
          console.warn("Server save failed, data saved locally:", serverError)
        }
      }

      const message = editingId
        ? "Data berhasil diperbarui"
        : "Data berhasil ditambahkan"
      
      const offlineNote = !isOnline || isOfflineMode
        ? " (tersimpan lokal, akan disinkronkan saat online)"
        : ""

      alert(message + offlineNote)
      onClose()
    } catch (error) {
      console.error("Save error:", error)
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data")
    } finally {
      setLoading(false)
    }
  }

  // ================= UI =================
  return (
    <div className="bg-background rounded-lg shadow-xl p-8 max-w-md w-full max-h-screen overflow-y-auto">
      <h2 className="text-2xl font-bold text-text mb-6">
        {editingId ? "Edit Penduduk" : "Tambah Penduduk"}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="nik" value={formData.nik} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="NIK" />
        <input type="text" name="nama" value={formData.nama} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nama Lengkap" />
        <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg text-sm" />

        <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm">
          <option>Laki-laki</option>
          <option>Perempuan</option>
        </select>

        <select name="agama" value={formData.agama} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm">
          <option>Islam</option>
          <option>Kristen</option>
          <option>Katolik</option>
          <option>Hindu</option>
          <option>Buddha</option>
          <option>Konghucu</option>
        </select>

        <select name="status_kawin" value={formData.status_kawin} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm">
          <option>Belum Kawin</option>
          <option>Kawin</option>
          <option>Cerai Hidup</option>
          <option>Cerai Mati</option>
        </select>

        <input type="text" name="pekerjaan" value={formData.pekerjaan} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Pekerjaan" />

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : editingId ? "Update" : "Tambah"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 py-2 rounded-lg font-medium"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
