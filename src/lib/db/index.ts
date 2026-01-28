import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: PostgresJsDatabase<typeof schema> | null = null;
let _connectionError: Error | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  // Return cached connection
  if (_db) return _db;

  // Throw cached error (prevents repeated connection attempts)
  if (_connectionError) throw _connectionError;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Check if we're in build phase
    if (process.env.NEXT_PHASE === "phase-production-build") {
      // During build, return a proxy that throws descriptive errors if accessed
      return new Proxy({} as PostgresJsDatabase<typeof schema>, {
        get(_, prop) {
          throw new Error(
            `Database accessed during build phase (property: ${String(prop)}). ` +
              `Ensure no database calls happen during static generation.`
          );
        },
      });
    }

    // At runtime, throw immediately
    _connectionError = new Error(
      "DATABASE_URL environment variable is not set. " +
        "Configure DATABASE_URL in your deployment environment."
    );
    throw _connectionError;
  }

  try {
    // Disable prefetch as it is not supported for "Transaction" pool mode
    const client = postgres(connectionString, {
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });

    _db = drizzle(client, { schema });
    return _db;
  } catch (error) {
    _connectionError = error as Error;
    throw _connectionError;
  }
}

// Export a proxy that lazily initializes the connection
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    const instance = getDb();
    const value = instance[prop as keyof PostgresJsDatabase<typeof schema>];
    // Bind methods to the instance to preserve 'this' context
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export type DbClient = PostgresJsDatabase<typeof schema>;
