import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get("force") === "true"
    
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Check if users already exist
    const existingAdmin = await usersCollection.findOne({ email: "admin@desa.id" })
    
    if (existingAdmin && !force) {
      return NextResponse.json({
        success: true,
        message: "Users already exist. Add ?force=true to recreate.",
        users: ["admin@desa.id", "petugas@desa.id", "warga@desa.id"]
      })
    }
    
    // Delete existing demo users if force=true
    if (force) {
      await usersCollection.deleteMany({
        email: { $in: ["admin@desa.id", "petugas@desa.id", "warga@desa.id"] }
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10)

    // Create demo users - using nama_lengkap for consistency
    const users = [
      {
        nama_lengkap: "Administrator",
        email: "admin@desa.id",
        password: hashedPassword,
        role: "admin",
        created_at: new Date(),
      },
      {
        nama_lengkap: "Petugas Desa",
        email: "petugas@desa.id",
        password: hashedPassword,
        role: "petugas",
        created_at: new Date(),
      },
      {
        nama_lengkap: "Warga Desa",
        email: "warga@desa.id",
        password: hashedPassword,
        role: "warga",
        created_at: new Date(),
      },
    ]

    await usersCollection.insertMany(users)

    return NextResponse.json({
      success: true,
      message: "Demo users created successfully",
      users: users.map(u => ({ email: u.email, role: u.role }))
    })
  } catch (error: any) {
    console.error("Seed error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
