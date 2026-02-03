import { openDB } from "idb"

const DB_NAME = "digital_desa_local"
const DB_VERSION = 1

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // ================= PENDUDUK =================
      if (!db.objectStoreNames.contains("penduduk")) {
        const store = db.createObjectStore("penduduk", {
          keyPath: "id",
          autoIncrement: true,
        })

        store.createIndex("nik", "nik", { unique: true })
        store.createIndex("is_synced", "is_synced")
        store.createIndex("sync_flag", "sync_flag")
      }

      // ================= AUTH =================
      if (!db.objectStoreNames.contains("auth")) {
        db.createObjectStore("auth", {
          keyPath: "id",
        })
      }
    },
  })
}

// ================= PENDUDUK LOCAL =================

export const addPendudukLocal = async (data: any) => {
  const db = await initDB()

  return db.add("penduduk", {
    ...data,
    sync_flag: "CREATE",
    is_synced: false,
    updated_at: new Date(),
  })
}

export const getAllPendudukLocal = async () => {
  const db = await initDB()
  return db.getAll("penduduk")
}

export const getUnsyncedPenduduk = async () => {
  const db = await initDB()
  return db.getAllFromIndex("penduduk", "is_synced", false)
}

export const markAsSynced = async (id: number) => {
  const db = await initDB()
  const data = await db.get("penduduk", id)

  if (!data) return

  await db.put("penduduk", {
    ...data,
    sync_flag: "SYNCED",
    is_synced: true,
  })
}
