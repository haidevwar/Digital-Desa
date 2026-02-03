import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { ObjectId } from "mongodb"
import crypto from "crypto"

/* =========================
   Ambil Token Aman (Next 16 Safe)
========================= */
function getToken(request: NextRequest) {
  const headerToken = request.headers
    .get("authorization")
    ?.replace("Bearer ", "")

  const cookieToken = request.cookies.get("token")?.value

  return headerToken || cookieToken || null
}

/* =========================
   GET DETAIL
========================= */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request)
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!hasPermission(decoded.role, "view_all_penduduk"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if (!ObjectId.isValid(params.id))
      return NextResponse.json(
        { error: "ID tidak valid" },
        { status: 400 }
      )

    const db = await getDatabase()

    const data = await db.collection("penduduk").findOne({
      _id: new ObjectId(params.id),
      is_deleted: false,
    })

    if (!data)
      return NextResponse.json(
        { error: "Penduduk tidak ditemukan" },
        { status: 404 }
      )

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("GET DETAIL ERROR:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/* =========================
   UPDATE
========================= */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request)
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!hasPermission(decoded.role, "edit_all_penduduk"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if (!ObjectId.isValid(params.id))
      return NextResponse.json(
        { error: "ID tidak valid" },
        { status: 400 }
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

    if (!nik || !nama)
      return NextResponse.json(
        { error: "NIK dan nama wajib diisi" },
        { status: 400 }
      )

    const db = await getDatabase()

    const existing = await db.collection("penduduk").findOne({
      _id: new ObjectId(params.id),
      is_deleted: false,
    })

    if (!existing)
      return NextResponse.json(
        { error: "Penduduk tidak ditemukan" },
        { status: 404 }
      )

    const duplicate = await db.collection("penduduk").findOne({
      nik,
      _id: { $ne: new ObjectId(params.id) },
      is_deleted: false,
    })

    if (duplicate)
      return NextResponse.json(
        { error: "NIK sudah digunakan oleh penduduk lain" },
        { status: 400 }
      )

    const dataHash = crypto
      .createHash("sha256")
      .update(`${nik}${nama}${tanggal_lahir}${keluarga_id}`)
      .digest("hex")

    const newSyncFlag =
      existing.data_hash !== dataHash ? "UPDATE" : existing.sync_flag

    await db.collection("penduduk").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          nik,
          nama,
          tanggal_lahir,
          keluarga_id: keluarga_id || null,
          jenis_kelamin: jenis_kelamin || null,
          agama: agama || null,
          status_kawin: status_kawin || null,
          pekerjaan: pekerjaan || null,
          data_hash: dataHash,
          sync_flag: newSyncFlag,
          is_synced: false,
          updated_at: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: "Data penduduk berhasil diperbarui",
    })
  } catch (error: any) {
    console.error("UPDATE ERROR:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/* =========================
   DELETE (Soft Delete)
========================= */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request)
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!hasPermission(decoded.role, "delete_penduduk"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    if (!ObjectId.isValid(params.id))
      return NextResponse.json(
        { error: "ID tidak valid" },
        { status: 400 }
      )

    const db = await getDatabase()

    await db.collection("penduduk").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          is_deleted: true,
          sync_flag: "DELETE",
          is_synced: false,
          updated_at: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: "Data penduduk berhasil dihapus",
    })
  } catch (error) {
    console.error("DELETE ERROR:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
