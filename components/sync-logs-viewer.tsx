"use client"

import { useEffect, useState } from "react"

interface SyncLog {
  id: number
  user_id: number
  action: string
  tables_synced: string
  record_count: number
  is_successful: boolean
  synced_at: string
}

export default function SyncLogsViewer() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/sync/logs", {
        credentials: "include",
      })

      if (!response.ok) {
        console.error("Gagal mengambil log:", response.statusText)
        return
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("Failed to fetch sync logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (filter === "success") return log.is_successful
    if (filter === "failed") return !log.is_successful
    return true
  })

  return (
    <div className="bg-background rounded-lg border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-text">Riwayat Sinkronisasi</h3>
        <button
          onClick={fetchLogs}
          className="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark transition"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 border-b border-border">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            filter === "all"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text"
          }`}
        >
          Semua ({logs.length})
        </button>
        <button
          onClick={() => setFilter("success")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            filter === "success"
              ? "border-success text-success"
              : "border-transparent text-text-secondary hover:text-text"
          }`}
        >
          Sukses ({logs.filter((l) => l.is_successful).length})
        </button>
        <button
          onClick={() => setFilter("failed")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            filter === "failed"
              ? "border-danger text-danger"
              : "border-transparent text-text-secondary hover:text-text"
          }`}
        >
          Gagal ({logs.filter((l) => !l.is_successful).length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-text-secondary">Loading...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          Tidak ada riwayat sinkronisasi
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-lg border transition cursor-pointer ${
                log.is_successful
                  ? "border-success bg-success bg-opacity-5 hover:bg-opacity-10"
                  : "border-danger bg-danger bg-opacity-5 hover:bg-opacity-10"
              }`}
              onClick={() =>
                setExpandedId(expandedId === log.id ? null : log.id)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.is_successful ? "bg-success" : "bg-danger"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-text">
                      {log.action} - {log.tables_synced}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {log.record_count} records
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs font-mono text-text-secondary">
                    {new Date(log.synced_at).toLocaleTimeString("id-ID")}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      log.is_successful ? "text-success" : "text-danger"
                    }`}
                  >
                    {log.is_successful ? "Berhasil" : "Gagal"}
                  </p>
                </div>
              </div>

              {expandedId === log.id && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-text-secondary">ID:</span>
                      <p className="font-mono text-xs text-text">{log.id}</p>
                    </div>
                    <div>
                      <span className="text-text-secondary">User:</span>
                      <p className="font-mono text-xs text-text">
                        {log.user_id}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Tabel:</span>
                      <p className="font-mono text-xs text-text">
                        {log.tables_synced}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Record:</span>
                      <p className="font-mono text-xs text-text">
                        {log.record_count}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-text-secondary">Waktu:</span>
                    <p className="font-mono text-xs text-text">
                      {new Date(log.synced_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
