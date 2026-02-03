import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()

    // Hitung data yang belum tersinkron
    const unsyncedCount = await db.collection("penduduk").countDocuments({
      is_synced: false,
      is_deleted: false,
    })

    return NextResponse.json({
      success: true,
      data: {
        pending_sync_count: unsyncedCount,
        unsynced_records: unsyncedCount,
        last_sync_time: null,
        is_syncing: false,
      },
    })
  } catch (error: any) {
    console.error("Sync status error:", error)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
