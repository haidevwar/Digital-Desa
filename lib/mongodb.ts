import { MongoClient, Db } from "mongodb"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB

if (!uri) {
  throw new Error("MONGODB_URI is not defined in environment variables")
}

if (!dbName) {
  throw new Error("MONGODB_DB is not defined in environment variables")
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // Gunakan global agar tidak membuat koneksi baru setiap hot reload
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // Production: buat koneksi baru
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

export async function getClient(): Promise<MongoClient> {
  return await clientPromise
}

export async function getDatabase(): Promise<Db> {
  const client = await getClient()
  return client.db(dbName)
}
