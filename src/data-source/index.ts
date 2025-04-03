import { DataSource } from "typeorm";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "typeorm_demo",
  synchronize: false, // Disable synchronize for migrations
  logging: process.env.NODE_ENV === "development",
  entities: [path.join(__dirname, "../entity/**/*.{ts,js}")],
  migrations: [path.join(__dirname, "../migration/**/*.{ts,js}")],
  migrationsTableName: "migrations",
  migrationsRun: false,
  migrationsTransactionMode: "each",
});
