/**
 * Grant admin role to a volunteer by email.
 * Run from the hub/ directory:
 *   node scripts/setAdminRole.mjs user@example.com
 *
 * Prerequisites: serviceAccount.json in hub/
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/setAdminRole.mjs <email>");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

initializeApp({
  credential: cert(join(__dirname, "../serviceAccount.json")),
});

const auth = getAuth();
const db = getFirestore();

const userRecord = await auth.getUserByEmail(email);
const uid = userRecord.uid;

await db.collection("volunteers").doc(uid).set({ role: "admin" }, { merge: true });

console.log(`✓ Granted admin role to ${userRecord.displayName || email} (${uid})`);
