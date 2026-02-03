import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = await getDatabase()

    const logs = await db
      .collection("sync_logs")
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray()

    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error: any) {
    console.error("SYNC LOGS ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    )
  }
}
