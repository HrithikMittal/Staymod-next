import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your environment to use the database.",
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }

  return new MongoClient(uri).connect();
}

/** Shared Mongo client (singleton in development to survive HMR). */
export function getMongoClient(): Promise<MongoClient> {
  return getClientPromise();
}

/** Default app database; set MONGODB_DB_NAME or falls back to "staymod". */
export async function getDb(name?: string): Promise<Db> {
  const client = await getMongoClient();
  return client.db(name ?? process.env.MONGODB_DB_NAME ?? "staymod");
}
