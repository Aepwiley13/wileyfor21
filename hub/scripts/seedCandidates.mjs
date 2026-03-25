/**
 * Seed /candidates collection.
 * Run from hub/ directory:
 *   node scripts/seedCandidates.mjs
 *
 * Prerequisites: serviceAccount.json in hub/
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

initializeApp({
  credential: cert(join(__dirname, "../serviceAccount.json")),
});

const db = getFirestore();

const candidates = [
  { id: "aaron",      name: "Aaron Wiley",       status: "active"    },
  { id: "mann",       name: "Darin W Mann",       status: "active"    },
  { id: "washburn",   name: "Anthony Washburn",   status: "active"    },
  { id: "otterstrom", name: "Stephen Otterstrom", status: "active"    },
  {
    id: "lock",
    name: "Jeneanne Lock",
    status: "active",
    conflictOfInterest: true,
    isOpposingCandidate: true,
  },
  { id: "ord",        name: "James Ord",          status: "withdrew"  },
];

for (const c of candidates) {
  await db.collection("candidates").doc(c.id).set(c);
  console.log(`Seeded candidate: ${c.name} (${c.id})`);
}

console.log("\nCandidates seeded successfully.");
