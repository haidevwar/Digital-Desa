"use client"

import type React from "react"
import { useEffect, useState } from "react"

interface Props {
  editingId: number | null
  onClose: () => void
}

export default function PendudukForm({ editingId, onClose }: Props) {
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

  // ================= FETCH DATA SAAT EDIT =================
  useEffect(() => {
    if (!editingId) return

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/penduduk/${editingId}`, {
          method: "GET",
          credentials: "include", // penting
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
      } catch (err) {
        setError("Terjadi kesalahan saat mengambil data")
      }
    }

    fetchData()
  }, [editingId])

  // ================= HANDLE CHANGE =================
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // ================= HANDLE SUBMIT =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = editingId
        ? `/api/penduduk/${editingId}`
        : "/api/penduduk"

      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        credentials: "include", // penting
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Gagal menyimpan data")
        return
      }

      alert(
        editingId
          ? "Data berhasil diperbarui"
          : "Data berhasil ditambahkan"
      )

      onClose()
    } catch (error) {
      setError("Terjadi kesalahan saat menyimpan data")
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
