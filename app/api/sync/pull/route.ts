import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    // ✅ Ambil token dari request, bukan cookies()
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { lastSyncTime } = body

    const db = await getDatabase()
    const collection = db.collection("penduduk")

    const filter: any = { is_deleted: false }

    if (lastSyncTime) {
      filter.updated_at = { $gt: new Date(lastSyncTime) }
    }

    const results = await collection
      .find(filter)
      .sort({ updated_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Pull error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
