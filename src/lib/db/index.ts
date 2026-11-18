import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: PostgresJsDatabase<typeof schema> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

function getSqlClient(): ReturnType<typeof postgres> {
  if (_sql) return _sql;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      throw new Error(
        "Database connection requested during the production build. " +
          "Database health checks and workers must run at runtime."
      );
    }

    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Configure DATABASE_URL in your deployment environment."
    );
  }

  // Disable prefetch as it is not supported for Transaction pool mode.
  _sql = postgres(connectionString, {
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

  return _sql;
}

function getDb(): PostgresJsDatabase<typeof schema> {
  // Return cached connection
  if (_db) return _db;

  _db = drizzle(getSqlClient(), { schema });
  return _db;
}

// Export a proxy that lazily initializes the connection
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    // Handle Symbol properties (used for serialization, type checking)
    if (typeof prop === "symbol") {
      return undefined;
    }

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

export async function closeDb(): Promise<void> {
  const sqlClient = _sql;
  _db = null;
  _sql = null;
  if (sqlClient) await sqlClient.end({ timeout: 5 });
}

export type AdvisoryLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false };

/**
 * Run work while holding a PostgreSQL session-level advisory lock.
 *
 * The reserved connection is important: advisory locks belong to a database
 * session, so acquiring one through a pooled query and then doing work on a
 * different pooled connection would not serialize concurrent workers.
 */
export async function withAdvisoryLock<T>(
  lockKey: number,
  work: () => Promise<T>
): Promise<AdvisoryLockResult<T>> {
  const connection = await getSqlClient().reserve();
  let acquired = false;

  try {
    const [{ locked }] = await connection<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(${lockKey}) AS locked
    `;
    acquired = Boolean(locked);

    if (!acquired) return { acquired: false };

    return { acquired: true, value: await work() };
  } finally {
    if (acquired) {
      try {
        await connection`
          SELECT pg_advisory_unlock(${lockKey})
        `;
      } finally {
        await connection.release();
      }
    } else {
      await connection.release();
    }
  }
}
