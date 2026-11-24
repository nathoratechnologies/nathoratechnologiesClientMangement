// Adds the starter Admin / Staff / Customer accounts to the live Firestore.
// Usage:  node scripts/seed-users.mjs "C:\path\to\nathora-technologies-firebase-adminsdk-xxxx.json"
// Safe to run again: an email that already exists is skipped, not duplicated.
import fs from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const keyPath = process.argv[2];
if (!keyPath || !fs.existsSync(keyPath)) {
  console.error("Give the path to your service-account JSON file as the first argument.");
  process.exit(1);
}
const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

// Passwords are random on every run and printed once below. Never hard-code them here:
// this repository is public.
const randomPassword = () => crypto.randomBytes(9).toString("base64url");
const accounts = [
  { name: "Admin", email: "admin@nathora.tech", password: randomPassword(), role: "ADMIN" },
  { name: "Staff", email: "staff@nathora.tech", password: randomPassword(), role: "STAFF" },
  { name: "Customer", email: "user@nathora.tech", password: randomPassword(), role: "USER" },
];

for (const a of accounts) {
  const existing = await db.collection("users").where("email", "==", a.email).limit(1).get();
  if (!existing.empty) {
    console.log(`skip   ${a.email} (already exists)`);
    continue;
  }
  await db.collection("users").add({
    name: a.name,
    email: a.email,
    phone: null,
    password: await bcrypt.hash(a.password, 10),
    role: a.role,
    active: true,
    createdAt: new Date(),
  });
  console.log(`added  ${a.email}  (${a.role})  password: ${a.password}`);
}
console.log("Done. Change these passwords in Dashboard > Profile.");
process.exit(0);
