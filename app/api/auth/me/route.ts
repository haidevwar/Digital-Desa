import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDatabase } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const db = await getDatabase()

    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId), // 🔥 WAJIB pakai ObjectId
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error("Auth me error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
