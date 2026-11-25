import dotenv from "dotenv";
dotenv.config();
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { seedAll } from "../src/services/seedService.js";
await connectDatabase();
const r = await seedAll({ force: true });
console.log(r);
await disconnectDatabase();
process.exit(0);
