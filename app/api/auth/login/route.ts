import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    const db = await getDatabase()

    const user = await db.collection("users").findOne({ email })

    if (!user) {
      return NextResponse.json(
        { error: "Email tidak ditemukan" },
        { status: 401 }
      )
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return NextResponse.json(
        { error: "Password salah" },
        { status: 401 }
      )
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    )

    const response = NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
        role: user.role,
      },
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
