import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { namaLengkap, email, password, role } = body

    if (!namaLengkap || !email || !password || !role) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      )
    }

    const db = await getDatabase()

    const existingUser = await db.collection("users").findOne({ email })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await db.collection("users").insertOne({
      nama_lengkap: namaLengkap,
      email,
      password: hashedPassword,
      role,
      created_at: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "Registrasi berhasil",
      userId: result.insertedId,
    })
  } catch (error: any) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
