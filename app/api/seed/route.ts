import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Check if users already exist
    const existingAdmin = await usersCollection.findOne({ email: "admin@desa.id" })
    
    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: "Users already exist",
        users: ["admin@desa.id", "petugas@desa.id", "warga@desa.id"]
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10)

    // Create demo users
    const users = [
      {
        namaLengkap: "Administrator",
        email: "admin@desa.id",
        password: hashedPassword,
        role: "admin",
        createdAt: new Date(),
      },
      {
        namaLengkap: "Petugas Desa",
        email: "petugas@desa.id",
        password: hashedPassword,
        role: "petugas",
        createdAt: new Date(),
      },
      {
        namaLengkap: "Warga Desa",
        email: "warga@desa.id",
        password: hashedPassword,
        role: "warga",
        createdAt: new Date(),
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
