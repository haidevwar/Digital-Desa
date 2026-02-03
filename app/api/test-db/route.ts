import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  const db = await getDatabase()

  const result = await db.collection("penduduk").insertOne({
    nama: "Test User",
    nik: "1234567890",
    createdAt: new Date(),
    is_synced: true,
    hash: "dummyhash123"
  })

  return NextResponse.json({
    success: true,
    insertedId: result.insertedId
  })
}
