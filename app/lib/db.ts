import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

const pool =
  global._mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    // Without this, mysql2 formats/parses DATETIME columns using whatever system timezone the
    // calling process happens to be in ('local' is the default) — the same class of bug already
    // fixed once for OTP expiry (db server clock was hours off). Pinning to UTC makes every JS
    // Date <-> DATETIME round-trip environment-independent, matching Date.now()'s own UTC basis.
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") {
  global._mysqlPool = pool;
}

export default pool;
