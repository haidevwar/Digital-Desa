import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import crypto from "crypto"

interface SyncConflict {
  recordId: string
  table: string
  localHash: string
  remoteHash: string
  action: string
  resolvedBy: string
}

export async function POST(request: NextRequest) {
  try {
    // ================= AUTH =================
    const cookieStore = await cookies()
    let token = cookieStore.get("token")?.value

    // Also check Authorization header for offline sync
    if (!token) {
      const authHeader = request.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: "Token invalid atau expired" }, { status: 401 })
    }

    // ================= BODY =================
    const body = await request.json()
    const { changes, conflictResolution = "timestamp" } = body

    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: "Changes tidak ditemukan" },
        { status: 400 }
      )
    }

    // ================= DATABASE =================
    const db = await getDatabase()
    const pendudukCollection = db.collection("penduduk")

    const results = {
      successful: 0,
      failed: 0,
      conflicts: 0,
    }

    const conflictDetails: SyncConflict[] = []

    // ================= PROCESS LOOP =================
    for (const change of changes) {
      const { table, action, data } = change

      if (table !== "penduduk") continue

      try {
        const recordId =
          typeof data._id === "string"
            ? new ObjectId(data._id)
            : data._id

        const dataToHash = `${data.nik}${data.nama}${data.tanggal_lahir}${data.keluarga_id}`
        const computedHash = crypto
          .createHash("sha256")
          .update(dataToHash)
          .digest("hex")

        // ================= CREATE =================
        if (action === "CREATE") {
          const existingNik = await pendudukCollection.findOne({
            nik: data.nik,
            is_deleted: false,
          })

          if (existingNik) {
            results.conflicts++
            conflictDetails.push({
              recordId: String(data._id || data.local_id || ""),
              table: "penduduk",
              localHash: computedHash,
              remoteHash: "DUPLICATE_NIK",
              action: "CREATE",
              resolvedBy: "rejected",
            })
            continue
          }

          // Remove local-only fields before inserting
          const { local_id, sync_flag: localSyncFlag, is_synced: localIsSynced, ...serverData } = data

          const insertResult = await pendudukCollection.insertOne({
            ...serverData,
            data_hash: computedHash,
            sync_flag: "SYNCED",
            is_synced: true,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          })

          results.successful++
          
          // Store inserted ID for client to update local record
          if (!conflictDetails.find(c => c.action === "CREATE")) {
            (results as any).insertedId = insertResult.insertedId.toString()
          }
        }

        // ================= UPDATE =================
        else if (action === "UPDATE") {
          const existing = await pendudukCollection.findOne({
            _id: recordId,
            is_deleted: false,
          })

          if (!existing) {
            results.conflicts++
            continue
          }

          const remoteHash = existing.data_hash
          const remoteUpdated = new Date(existing.updated_at).getTime()

          if (remoteHash === computedHash) {
            results.successful++
            continue
          }

          const localTime = data.updated_at
            ? new Date(data.updated_at).getTime()
            : Date.now()

          let shouldUpdate = false

          if (conflictResolution === "timestamp") {
            shouldUpdate = localTime > remoteUpdated
          } else if (conflictResolution === "local") {
            shouldUpdate = true
          } else if (conflictResolution === "remote") {
            shouldUpdate = false
          }

          if (shouldUpdate) {
            await pendudukCollection.updateOne(
              { _id: recordId },
              {
                $set: {
                  ...data,
                  data_hash: computedHash,
                  sync_flag: "SYNCED",
                  is_synced: true,
                  updated_at: new Date(),
                },
              }
            )

            results.successful++
          } else {
            results.conflicts++
            conflictDetails.push({
              recordId: String(data._id),
              table: "penduduk",
              localHash: computedHash,
              remoteHash,
              action: "UPDATE",
              resolvedBy: "remote",
            })
          }
        }

        // ================= DELETE =================
        else if (action === "DELETE") {
          await pendudukCollection.updateOne(
            { _id: recordId },
            {
              $set: {
                is_deleted: true,
                sync_flag: "SYNCED",
                is_synced: true,
                updated_at: new Date(),
              },
            }
          )

          results.successful++
        }
      } catch (err) {
        console.error("Push item error:", err)
        results.failed++
      }
    }

    // ================= LOGGING =================
    try {
      await db.collection("sync_logs").insertOne({
        user_id: decoded.userId,
        action: "PUSH",
        tables_synced: ["penduduk"],
        record_count: changes.length,
        is_successful: results.failed === 0,
        synced_at: new Date(),
      })
    } catch (logError) {
      console.warn("Sync log gagal disimpan:", logError)
    }

    return NextResponse.json({
      success: true,
      results,
      conflicts: conflictDetails,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Sync push error:", error)

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
