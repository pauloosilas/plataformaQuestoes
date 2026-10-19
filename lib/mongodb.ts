import "server-only";

import { MongoClient } from "mongodb";

const globalMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise() {
  if (globalMongo.mongoClientPromise) return globalMongo.mongoClientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Defina MONGODB_URI no arquivo .env.local.");

  const connecting = new MongoClient(uri, { maxPoolSize: 10 })
    .connect()
    .catch((error: unknown) => {
      // Allow the next request to retry after a transient DNS/network failure.
      if (globalMongo.mongoClientPromise === connecting) {
        delete globalMongo.mongoClientPromise;
      }
      throw error;
    });

  globalMongo.mongoClientPromise = connecting;
  return connecting;
}

export default getClientPromise;

export async function getDatabase() {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB ?? "questoes");
}
