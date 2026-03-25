/**
 * Seed /campaignStats doc id:"live".
 * Run from hub/ directory:
 *   node scripts/seedCampaignStats.mjs
 *
 * Prerequisites: serviceAccount.json in hub/
 * Run AFTER importDelegates.mjs so the counts are accurate.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

initializeApp({
  credential: cert(join(__dirname, "../serviceAccount.json")),
});

const db = getFirestore();

await db.collection("campaignStats").doc("live").set({
  target: 53,
  minimumToWin: 46,
  totalDelegates: 76,

  totalByStage: {
    unknown: 54,
    identified: 0,
    engaged: 0,
    leaning: 0,
    committed: 0,
    locked: 0,
    not_winnable: 0,
  },

  leaningByCandidate: {
    // Aaron = 1 (himself, committed from day 1)
    // Lock  = 1 (she will vote for herself)
    aaron: 1,
    mann: 0,
    washburn: 0,
    otterstrom: 0,
    lock: 1,
    ord_was: 0,
    undecided: 52,
    refused: 0,
  },

  todayContactCount: 0,
  weeklyStageUpgrades: 0,
  paceToTarget: 0,
  staleCount: 0,
  staleDelegates: [],
  lastUpdated: FieldValue.serverTimestamp(),
});

console.log("campaignStats/live seeded successfully.");
