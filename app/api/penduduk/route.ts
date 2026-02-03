import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { getDatabase } from "@/lib/mongodb"
import crypto from "crypto"

/* =========================
   Helper Ambil Token (Next 16 Safe)
========================= */
function getToken(request: NextRequest) {
  const headerToken = request.headers
    .get("authorization")
    ?.replace("Bearer ", "")

  const cookieToken = request.cookies.get("token")?.value

  return headerToken || cookieToken || null
}

/* =========================
   GET LIST PENDUDUK
========================= */
export async function GET(request: NextRequest) {
  try {
    const token = getToken(request)
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!hasPermission(decoded.role, "view_all_penduduk"))
      return NextResponse.json(
        { error: "Forbidden - Permission denied" },
        { status: 403 }
      )

    const { searchParams } = new URL(request.url)
    const keluargaId = searchParams.get("keluarga_id")
    const syncFrom = searchParams.get("sync_from")

    const db = await getDatabase()
    const collection = db.collection("penduduk")

    const filter: any = { is_deleted: false }

    if (keluargaId) {
      filter.keluarga_id = keluargaId
    }

    if (syncFrom) {
      filter.updated_at = { $gt: new Date(syncFrom) }
    }

    const results = await collection
      .find(filter)
      .sort({ updated_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error("GET penduduk error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/* =========================
   CREATE PENDUDUK
========================= */
export async function POST(request: NextRequest) {
  try {
    const token = getToken(request)
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!hasPermission(decoded.role, "create_penduduk"))
      return NextResponse.json(
        { error: "Forbidden - Permission denied" },
        { status: 403 }
      )

    const body = await request.json()

    const {
      nik,
      nama,
      tanggal_lahir,
      keluarga_id,
      jenis_kelamin,
      agama,
      status_kawin,
      pekerjaan,
    } = body

    if (!nik || !nama || !keluarga_id)
      return NextResponse.json(
        { error: "NIK, nama, dan keluarga_id diperlukan" },
        { status: 400 }
      )

    const db = await getDatabase()
    const collection = db.collection("penduduk")

    const existing = await collection.findOne({
      nik,
      is_deleted: false,
    })

    if (existing)
      return NextResponse.json(
        { error: "Data dengan NIK tersebut sudah ada" },
        { status: 400 }
      )

    const dataHash = crypto
      .createHash("sha256")
      .update(`${nik}${nama}${tanggal_lahir}${keluarga_id}`)
      .digest("hex")

    const newData = {
      nik,
      nama,
      tanggal_lahir,
      keluarga_id,
      jenis_kelamin: jenis_kelamin || null,
      agama: agama || null,
      status_kawin: status_kawin || null,
      pekerjaan: pekerjaan || null,
      data_hash: dataHash,
      sync_flag: "CREATE",
      is_synced: false,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const result = await collection.insertOne(newData)

    await db.collection("sync_queue").insertOne({
      action: "CREATE",
      table_name: "penduduk",
      record_id: result.insertedId,
      user_id: decoded.userId,
      created_at: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "Data penduduk berhasil ditambahkan",
      id: result.insertedId,
    })
  } catch (error: any) {
    console.error("POST penduduk error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
