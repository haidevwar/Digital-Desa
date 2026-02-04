import { MongoClient, Db } from "mongodb"

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient> | null = null

function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables")
  }

  if (process.env.NODE_ENV === "development") {
    // Gunakan global agar tidak membuat koneksi baru setiap hot reload
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri)
      global._mongoClientPromise = client.connect()
    }
    return global._mongoClientPromise
  } else {
    // Production: gunakan singleton
    if (!clientPromise) {
      const client = new MongoClient(uri)
      clientPromise = client.connect()
    }
    return clientPromise
  }
}

export async function getClient(): Promise<MongoClient> {
  return await getMongoClient()
}

export async function getDatabase(): Promise<Db> {
  const dbName = process.env.MONGODB_DB
  
  if (!dbName) {
    throw new Error("MONGODB_DB is not defined in environment variables")
  }
  
  const client = await getClient()
  return client.db(dbName)
}
