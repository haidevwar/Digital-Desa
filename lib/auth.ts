import { getDatabase } from "./mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET as string

export async function registerUser(
  namaLengkap: string,
  email: string,
  password: string,
  role: string
) {
  const db = await getDatabase()

  const existingUser = await db.collection("users").findOne({ email })
  if (existingUser) {
    return { success: false, message: "Email sudah terdaftar" }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await db.collection("users").insertOne({
    namaLengkap,
    email,
    password: hashedPassword,
    role,
    createdAt: new Date(),
  })

  return { success: true, message: "Registrasi berhasil" }
}

export async function loginUser(email: string, password: string) {
  const db = await getDatabase()

  const user = await db.collection("users").findOne({ email })
  if (!user) {
    return { success: false, message: "Email tidak ditemukan" }
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    return { success: false, message: "Password salah" }
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  )

  return {
    success: true,
    message: "Login berhasil",
    user: {
      id: user._id,
      namaLengkap: user.namaLengkap,
      email: user.email,
      role: user.role,
    },
    token,
  }
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}
