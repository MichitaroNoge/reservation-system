import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConnection } from "./environment";
import * as schema from "./schema";

type DatabaseConnection = Awaited<ReturnType<typeof createDatabase>>;
const runtime = globalThis as typeof globalThis & { reservationDatabase?: DatabaseConnection; reservationDatabasePromise?: Promise<DatabaseConnection> };
async function createDatabase() {
  const config = databaseConnection();
  let connector: { close(): void } | undefined;
  let options;
  if (config.kind === "cloud-sql") {
    const [{ Connector, AuthTypes, IpAddressTypes }, { GoogleAuth }] = await Promise.all([import("@google-cloud/cloud-sql-connector"), import("google-auth-library")]);
    const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : undefined;
    const cloudConnector = new Connector({ auth: new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/sqlservice.login"] }) });
    connector = cloudConnector;
    try {
      const secureOptions = await cloudConnector.getOptions({ instanceConnectionName: config.instanceConnectionName, authType: AuthTypes.IAM, ipType: config.ipType === "PRIVATE" ? IpAddressTypes.PRIVATE : IpAddressTypes.PUBLIC });
      options = { ...secureOptions, user: config.user, database: config.database, max: 5 };
    } catch (error) { connector.close(); throw error; }
  } else options = { connectionString: config.connectionString, max: 10 };
  const pool = new Pool({ ...options, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
  pool.on("error", () => console.error("Idle PostgreSQL connection failed."));
  return { pool, db: drizzle(pool, { schema }), connector };
}
export async function getDatabase() {
  if (runtime.reservationDatabase) {
    // The pool survives development hot reloads; bind queries to the current schema.
    if (runtime.reservationDatabase.db._.fullSchema.reservation !== schema.reservation) {
      runtime.reservationDatabase.db = drizzle(runtime.reservationDatabase.pool, { schema });
    }
    return runtime.reservationDatabase.db;
  }
  runtime.reservationDatabasePromise ??= createDatabase().then(database => {
    runtime.reservationDatabase = database;
    return database;
  }).catch(error => { runtime.reservationDatabasePromise = undefined; throw error; });
  return (await runtime.reservationDatabasePromise).db;
}
