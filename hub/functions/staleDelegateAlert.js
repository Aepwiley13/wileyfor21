/**
 * Cloud Function: staleDelegateAlert (scheduled)
 *
 * Runs every 24 hours. Finds all non-vacant, non-opposing delegates who
 * have not been contacted in the last 14 days and writes a summary to
 * /campaignStats/live for the admin dashboard to display.
 *
 * Deploy: firebase deploy --only functions:staleDelegateAlert
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

try { initializeApp(); } catch (_) {}

exports.staleDelegateAlert = onSchedule("every 24 hours", async () => {
  const db = getFirestore();

  const fourteenDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  );

  // Fetch stale candidates — skip locked/not_winnable in JS because
  // Firestore "not-in" + "<" + "==" compound queries require a composite index.
  const snap = await db
    .collection("delegates")
    .where("lastContactedAt", "<", fourteenDaysAgo)
    .where("isVacant", "==", false)
    .where("isOpposingCandidate", "==", false)
    .get();

  const staleList = snap.docs
    .map((d) => ({
      id: d.id,
      name: d.data().name,
      precinct: d.data().precinct,
      stage: d.data().stage,
    }))
    .filter((d) => !["locked", "not_winnable"].includes(d.stage));

  await db.collection("campaignStats").doc("live").update({
    staleCount: staleList.length,
    staleDelegates: staleList,
    lastUpdated: FieldValue.serverTimestamp(),
  });

  console.log(`staleDelegateAlert: ${staleList.length} stale delegates written.`);
});
