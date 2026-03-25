/**
 * One-time delegate import script.
 * Run from the hub/ directory:
 *   node scripts/importDelegates.mjs
 *
 * Prerequisites:
 *   npm install -g firebase-admin csv-parse  (or: npm install --save-dev firebase-admin csv-parse)
 *   Place serviceAccount.json in hub/ (from Firebase console → Project settings → Service accounts)
 *   Place delegates.csv in hub/
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

initializeApp({
  credential: cert(join(__dirname, "../serviceAccount.json")),
});

const db = getFirestore();

const parser = createReadStream(join(__dirname, "../delegates.csv")).pipe(
  parse({ columns: true, skip_empty_lines: true })
);

let count = 0;

for await (const row of parser) {
  const name = row.name?.trim() || "";
  const isVacant = !name;
  const isLock = name === "Jeneanne Lock";
  const role = row.role?.trim() || "";
  const isPLEO = role.toUpperCase().includes("PLEO");

  const doc = {
    // Identity
    name,
    precinct: row.precinct?.trim() || "",
    role,
    phone: row.phone?.trim() || "",
    email: row.email?.trim() || "",
    address: row.address?.trim() || "",
    district: "HD21",

    // Pipeline stage
    stage: "unknown",
    stageHistory: [],

    // Competitive intel
    currentLeaning: "undecided",
    leaningHistory: [],
    wasOrdSupporter: false,

    // Issues & AI briefing (Team B populates via Claude API)
    topIssues: [],
    talkingPoints: [],
    avoidTopics: [],
    exactWordsLog: [],

    // Contact tracking
    assignedVolunteerId: null,
    lastContactedAt: null,
    lastContactedBy: null,
    totalContacts: 0,
    surveyResponseIds: [],

    // Flags
    conflictOfInterest: isLock,
    isOpposingCandidate: isLock,
    isPLEO,
    isVacant,
  };

  await db.collection("delegates").add(doc);
  count++;
  if (name) {
    console.log(`Imported: ${name} (${row.precinct} ${role})`);
  } else {
    console.log(`Imported: [VACANT] (${row.precinct} ${role})`);
  }
}

console.log(`\nImport complete. ${count} delegates written to Firestore.`);
