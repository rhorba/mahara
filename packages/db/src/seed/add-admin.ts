import * as argon2 from "argon2";
import { db } from "../client";
import { users } from "../schema";

const pw = await argon2.hash("demo1234", { type: argon2.argon2id });
await db
  .insert(users)
  .values({
    id: crypto.randomUUID(),
    name: "Admin Mahara",
    email: "admin@demo.mahara.ma",
    role: "admin",
    city: "Casablanca",
    passwordHash: pw,
    isActive: true,
  })
  .onConflictDoNothing();

console.log("✅ Admin user: admin@demo.mahara.ma / demo1234");
process.exit(0);
