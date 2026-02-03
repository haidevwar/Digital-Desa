import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dataList = await req.json()

    if (!Array.isArray(dataList) || dataList.length === 0) {
      return NextResponse.json(
        { error: "Data kosong" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const collection = db.collection("penduduk")

    let success = 0
    let updated = 0
    let inserted = 0

    for (const data of dataList) {
      try {
        const existing = await collection.findOne({ nik: data.nik })

        const incomingDate = new Date(data.updated_at)

        if (existing) {
          const existingDate = new Date(existing.updated_at)

          if (existing.hash_value !== data.hash_value) {
            if (incomingDate > existingDate) {
              await collection.updateOne(
                { nik: data.nik },
                {
                  $set: {
                    nama: data.nama,
                    alamat: data.alamat,
                    hash_value: data.hash_value,
                    updated_at: incomingDate,
                  },
                }
              )
              updated++
            }
          }
        } else {
          await collection.insertOne({
            nik: data.nik,
            nama: data.nama,
            alamat: data.alamat,
            hash_value: data.hash_value,
            updated_at: incomingDate,
            created_at: new Date(),
            is_deleted: false,
          })
          inserted++
        }

        success++
      } catch (itemError) {
        console.error("Item sync error:", itemError)
      }
    }

    // Logging aktivitas sinkronisasi
    await db.collection("sync_logs").insertOne({
      user_id: decoded.userId,
      action: "PUSH",
      tables_synced: ["penduduk"],
      record_count: dataList.length,
      inserted,
      updated,
      is_successful: true,
      synced_at: new Date(),
    })

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      total_processed: success,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Sync error:", error)

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
