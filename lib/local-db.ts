import { openDB, type IDBPDatabase } from "idb"

const DB_NAME = "digital_desa_local"
const DB_VERSION = 2

let dbInstance: IDBPDatabase | null = null

export const initDB = async () => {
  if (dbInstance) return dbInstance
  
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // ================= PENDUDUK =================
      if (!db.objectStoreNames.contains("penduduk")) {
        const store = db.createObjectStore("penduduk", {
          keyPath: "local_id",
          autoIncrement: true,
        })
        store.createIndex("nik", "nik", { unique: false })
        store.createIndex("is_synced", "is_synced")
        store.createIndex("sync_flag", "sync_flag")
        store.createIndex("server_id", "server_id", { unique: false })
      }

      // ================= AUTH =================
      if (!db.objectStoreNames.contains("auth")) {
        db.createObjectStore("auth", { keyPath: "id" })
      }

      // ================= SYNC QUEUE =================
      if (!db.objectStoreNames.contains("sync_queue")) {
        const syncStore = db.createObjectStore("sync_queue", {
          keyPath: "queue_id",
          autoIncrement: true,
        })
        syncStore.createIndex("table", "table")
        syncStore.createIndex("action", "action")
        syncStore.createIndex("created_at", "created_at")
      }

      // ================= CACHED DATA =================
      if (!db.objectStoreNames.contains("cached_data")) {
        const cacheStore = db.createObjectStore("cached_data", { keyPath: "key" })
        cacheStore.createIndex("expires_at", "expires_at")
      }
    },
  })
  
  return dbInstance
}

// ================= AUTH LOCAL STORAGE =================

export interface LocalAuthData {
  id: string
  token: string
  user: {
    _id: string
    nama_lengkap: string
    email: string
    role: string
  }
  loginTime: string
  expiresAt: string
  passwordHash?: string // For offline verification
}

export const saveAuthLocal = async (authData: LocalAuthData) => {
  const db = await initDB()
  await db.put("auth", authData)
}

export const getAuthLocal = async (): Promise<LocalAuthData | undefined> => {
  const db = await initDB()
  return db.get("auth", "current_user")
}

export const clearAuthLocal = async () => {
  const db = await initDB()
  await db.delete("auth", "current_user")
}

export const isTokenValid = async (): Promise<boolean> => {
  const auth = await getAuthLocal()
  if (!auth) return false
  
  const now = new Date()
  const expiresAt = new Date(auth.expiresAt)
  return now < expiresAt
}

// ================= PENDUDUK LOCAL =================

export interface LocalPenduduk {
  local_id?: number
  server_id?: string
  nik: string
  nama: string
  tanggal_lahir: string
  keluarga_id: string
  jenis_kelamin: string
  agama: string
  status_kawin: string
  pekerjaan: string
  sync_flag: "CREATE" | "UPDATE" | "DELETE" | "SYNCED"
  is_synced: boolean
  created_at: string
  updated_at: string
}

export const addPendudukLocal = async (data: Omit<LocalPenduduk, "local_id" | "sync_flag" | "is_synced" | "created_at" | "updated_at">) => {
  const db = await initDB()
  const now = new Date().toISOString()
  
  const pendudukData: Omit<LocalPenduduk, "local_id"> = {
    ...data,
    sync_flag: "CREATE",
    is_synced: false,
    created_at: now,
    updated_at: now,
  }

  const localId = await db.add("penduduk", pendudukData)
  
  // Add to sync queue
  await addToSyncQueue({
    table: "penduduk",
    action: "CREATE",
    local_id: localId as number,
    data: { ...pendudukData, local_id: localId },
  })
  
  return localId
}

export const updatePendudukLocal = async (localId: number, data: Partial<LocalPenduduk>) => {
  const db = await initDB()
  const existing = await db.get("penduduk", localId)
  
  if (!existing) throw new Error("Data tidak ditemukan")
  
  const now = new Date().toISOString()
  const updatedData = {
    ...existing,
    ...data,
    sync_flag: existing.is_synced ? "UPDATE" : existing.sync_flag,
    is_synced: false,
    updated_at: now,
  }
  
  await db.put("penduduk", updatedData)
  
  // Add to sync queue
  await addToSyncQueue({
    table: "penduduk",
    action: "UPDATE",
    local_id: localId,
    server_id: existing.server_id,
    data: updatedData,
  })
  
  return updatedData
}

export const deletePendudukLocal = async (localId: number) => {
  const db = await initDB()
  const existing = await db.get("penduduk", localId)
  
  if (!existing) throw new Error("Data tidak ditemukan")
  
  if (existing.is_synced && existing.server_id) {
    // Mark for deletion on server
    const now = new Date().toISOString()
    await db.put("penduduk", {
      ...existing,
      sync_flag: "DELETE",
      is_synced: false,
      updated_at: now,
    })
    
    await addToSyncQueue({
      table: "penduduk",
      action: "DELETE",
      local_id: localId,
      server_id: existing.server_id,
      data: existing,
    })
  } else {
    // Never synced, just delete locally
    await db.delete("penduduk", localId)
    // Remove from sync queue if exists
    await removeFromSyncQueue("penduduk", localId)
  }
}

export const getAllPendudukLocal = async (): Promise<LocalPenduduk[]> => {
  const db = await initDB()
  const all = await db.getAll("penduduk")
  // Filter out deleted items
  return all.filter((p: LocalPenduduk) => p.sync_flag !== "DELETE")
}

export const getUnsyncedPenduduk = async (): Promise<LocalPenduduk[]> => {
  const db = await initDB()
  return db.getAllFromIndex("penduduk", "is_synced", false)
}

export const getPendudukByLocalId = async (localId: number): Promise<LocalPenduduk | undefined> => {
  const db = await initDB()
  return db.get("penduduk", localId)
}

export const getPendudukByServerId = async (serverId: string): Promise<LocalPenduduk | undefined> => {
  const db = await initDB()
  const all = await db.getAllFromIndex("penduduk", "server_id", serverId)
  return all[0]
}

export const markPendudukAsSynced = async (localId: number, serverId: string) => {
  const db = await initDB()
  const data = await db.get("penduduk", localId)
  
  if (!data) return
  
  await db.put("penduduk", {
    ...data,
    server_id: serverId,
    sync_flag: "SYNCED",
    is_synced: true,
  })
  
  // Remove from sync queue
  await removeFromSyncQueue("penduduk", localId)
}

export const clearAllPendudukLocal = async () => {
  const db = await initDB()
  await db.clear("penduduk")
}

export const savePendudukFromServer = async (serverData: any[]) => {
  const db = await initDB()
  const tx = db.transaction("penduduk", "readwrite")
  
  for (const item of serverData) {
    const existing = await tx.store.index("server_id").get(item._id)
    
    if (!existing) {
      await tx.store.add({
        server_id: item._id,
        nik: item.nik,
        nama: item.nama,
        tanggal_lahir: item.tanggal_lahir,
        keluarga_id: item.keluarga_id?.toString() || "1",
        jenis_kelamin: item.jenis_kelamin,
        agama: item.agama,
        status_kawin: item.status_kawin,
        pekerjaan: item.pekerjaan,
        sync_flag: "SYNCED",
        is_synced: true,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      })
    } else if (existing.is_synced) {
      // Only update if no local changes
      await tx.store.put({
        ...existing,
        nik: item.nik,
        nama: item.nama,
        tanggal_lahir: item.tanggal_lahir,
        keluarga_id: item.keluarga_id?.toString() || "1",
        jenis_kelamin: item.jenis_kelamin,
        agama: item.agama,
        status_kawin: item.status_kawin,
        pekerjaan: item.pekerjaan,
        updated_at: item.updated_at || new Date().toISOString(),
      })
    }
  }
  
  await tx.done
}

// ================= SYNC QUEUE =================

export interface SyncQueueItem {
  queue_id?: number
  table: string
  action: "CREATE" | "UPDATE" | "DELETE"
  local_id: number
  server_id?: string
  data: any
  created_at: string
  retry_count: number
  last_error?: string
}

export const addToSyncQueue = async (item: Omit<SyncQueueItem, "queue_id" | "created_at" | "retry_count">) => {
  const db = await initDB()
  
  // Check if similar item already exists
  const existing = await db.getAllFromIndex("sync_queue", "table", item.table)
  const duplicate = existing.find((e: SyncQueueItem) => e.local_id === item.local_id && e.action === item.action)
  
  if (duplicate) {
    // Update existing queue item
    await db.put("sync_queue", {
      ...duplicate,
      data: item.data,
      created_at: new Date().toISOString(),
    })
    return duplicate.queue_id
  }
  
  return db.add("sync_queue", {
    ...item,
    created_at: new Date().toISOString(),
    retry_count: 0,
  })
}

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  const db = await initDB()
  return db.getAll("sync_queue")
}

export const getSyncQueueByTable = async (table: string): Promise<SyncQueueItem[]> => {
  const db = await initDB()
  return db.getAllFromIndex("sync_queue", "table", table)
}

export const removeFromSyncQueue = async (table: string, localId: number) => {
  const db = await initDB()
  const items = await db.getAllFromIndex("sync_queue", "table", table)
  
  for (const item of items) {
    if ((item as SyncQueueItem).local_id === localId) {
      await db.delete("sync_queue", (item as SyncQueueItem).queue_id!)
    }
  }
}

export const removeSyncQueueItem = async (queueId: number) => {
  const db = await initDB()
  await db.delete("sync_queue", queueId)
}

export const updateSyncQueueRetry = async (queueId: number, error: string) => {
  const db = await initDB()
  const item = await db.get("sync_queue", queueId)
  
  if (item) {
    await db.put("sync_queue", {
      ...item,
      retry_count: (item as SyncQueueItem).retry_count + 1,
      last_error: error,
    })
  }
}

export const clearSyncQueue = async () => {
  const db = await initDB()
  await db.clear("sync_queue")
}

export const getSyncQueueCount = async (): Promise<number> => {
  const db = await initDB()
  return db.count("sync_queue")
}

// ================= CACHED DATA =================

export const setCachedData = async (key: string, data: any, ttlMinutes: number = 60) => {
  const db = await initDB()
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
  
  await db.put("cached_data", {
    key,
    data,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  })
}

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  const db = await initDB()
  const cached = await db.get("cached_data", key)
  
  if (!cached) return null
  
  const now = new Date()
  const expiresAt = new Date(cached.expires_at)
  
  if (now > expiresAt) {
    await db.delete("cached_data", key)
    return null
  }
  
  return cached.data as T
}

export const clearExpiredCache = async () => {
  const db = await initDB()
  const all = await db.getAll("cached_data")
  const now = new Date()
  
  for (const item of all) {
    if (new Date(item.expires_at) < now) {
      await db.delete("cached_data", item.key)
    }
  }
}

// ================= LEGACY SUPPORT =================

export const markAsSynced = async (id: number) => {
  await markPendudukAsSynced(id, "")
}
