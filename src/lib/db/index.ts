import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // During build time, DATABASE_URL won't be available
    // Return a dummy object - actual DB calls will fail at runtime if URL not set
    console.warn("DATABASE_URL not set - database operations will fail at runtime");
    return {} as PostgresJsDatabase<typeof schema>;
  }

  // Disable prefetch as it is not supported for "Transaction" pool mode
  const client = postgres(connectionString, {
    prepare: false,
    connect_timeout: 10, // 10 second timeout
    idle_timeout: 20,
    max_lifetime: 60 * 30, // 30 minutes
  });

  _db = drizzle(client, { schema });
  return _db;
}

// Export a proxy that lazily initializes the connection
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<typeof schema>];
  },
});

export type DbClient = PostgresJsDatabase<typeof schema>;
