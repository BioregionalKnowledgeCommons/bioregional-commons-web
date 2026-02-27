import "server-only";
import pg from "pg";

const { Pool } = pg;

export const authDb = new Pool({
  connectionString: process.env.AUTH_DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
