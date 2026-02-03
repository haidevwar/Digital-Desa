"use client"

import { useState } from "react"

interface Penduduk {
  _id: string
  nik: string
  nama: string
  tanggal_lahir: string
  jenis_kelamin: string
  agama: string
  status_kawin: string
  pekerjaan: string
  sync_flag: string
  is_synced: boolean
}

interface Props {
  penduduk: Penduduk[]
  loading: boolean
  onEdit: (id: string) => void
  onDelete: () => void
}

export default function PendudukTable({
  penduduk,
  loading,
  onEdit,
  onDelete,
}: Props) {
  const [page, setPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(penduduk.length / itemsPerPage)
  const startIdx = (page - 1) * itemsPerPage
  const paginatedData = penduduk.slice(startIdx, startIdx + itemsPerPage)

  const getSyncFlagColor = (flag: string) => {
    switch (flag) {
      case "CREATE":
        return "bg-blue-100 text-blue-800"
      case "UPDATE":
        return "bg-yellow-100 text-yellow-800"
      case "DELETE":
        return "bg-red-100 text-red-800"
      case "SYNCED":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return

    try {
      const response = await fetch(`/api/penduduk/${id}`, {
        method: "DELETE",
        credentials: "include", // WAJIB untuk cookie auth
      })

      if (response.ok) {
        alert("Data berhasil dihapus")
        onDelete()
      } else {
        const err = await response.json()
        alert(err.error || "Gagal menghapus data")
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Terjadi kesalahan saat menghapus data")
    }
  }

  if (loading) {
    return (
      <div className="bg-background p-6 rounded-lg border border-border shadow-sm text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-text-secondary mt-4">Memuat data...</p>
      </div>
    )
  }

  return (
    <div className="bg-background rounded-lg border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">NIK</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Nama</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Tanggal Lahir</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Jenis Kelamin</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Status Sync</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-text">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                  Tidak ada data penduduk
                </td>
              </tr>
            ) : (
              paginatedData.map((p) => (
                <tr key={p._id} className="hover:bg-surface transition">
                  <td className="px-6 py-3 text-sm font-mono">{p.nik}</td>
                  <td className="px-6 py-3 text-sm">{p.nama}</td>
                  <td className="px-6 py-3 text-sm">
                    {p.tanggal_lahir
                      ? new Date(p.tanggal_lahir).toLocaleDateString("id-ID")
                      : "-"}
                  </td>
                  <td className="px-6 py-3 text-sm">{p.jenis_kelamin || "-"}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getSyncFlagColor(
                        p.sync_flag
                      )}`}
                    >
                      {p.sync_flag}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm space-x-2">
                    <button
                      onClick={() => onEdit(p._id)}
                      className="bg-primary text-white px-3 py-1 rounded hover:bg-primary-dark transition text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="bg-danger text-white px-3 py-1 rounded hover:bg-red-600 transition text-xs font-medium"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-surface">
          <span className="text-sm text-text-secondary">
            Halaman {page} dari {totalPages}
          </span>
          <div className="space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-border rounded disabled:opacity-50 transition text-sm"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-border rounded disabled:opacity-50 transition text-sm"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
