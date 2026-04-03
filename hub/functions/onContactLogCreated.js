/**
 * Cloud Function: onContactLogCreated
 *
 * Triggers every time a document is created in /contactLogs.
 * 1. Updates the delegate document with contact info, leaning, and stage change.
 * 2. Recalculates /campaignStats/live by re-aggregating all delegates.
 * 3. Fires milestones when committed+locked crosses 10/20/30/40/50/53/60/70.
 *
 * Expected contactLog document shape:
 * {
 *   delegateId: string,
 *   delegateName: string,
 *   volunteerId: string,
 *   volunteerName: string,
 *   leaningToward: string,   // one of: aaron|mann|washburn|otterstrom|lock|ord_was|undecided|refused
 *   stageBeforeContact: string,
 *   stageAfterContact: string,
 *   exactWords: string,      // verbatim quote (optional)
 *   issuesRaised: string[],  // topics the delegate raised (optional)
 *   notes: string,
 *   createdAt: Timestamp,
 * }
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// initializeApp is safe to call multiple times — Admin SDK handles dedup
try { initializeApp(); } catch (_) {}

exports.onContactLogCreated = onDocumentCreated(
  "contactLogs/{logId}",
  async (event) => {
    const log = event.data.data();
    const db = getFirestore();

    if (!log.delegateId) {
      console.error("contactLog missing delegateId — skipping");
      return;
    }

    // ── 1. Update the delegate document ──────────────────────────────────
    const delegateRef = db.collection("delegates").doc(log.delegateId);

    const updateData = {
      lastContactedAt: FieldValue.serverTimestamp(),
      lastContactedBy: log.volunteerName || "unknown",
      totalContacts: FieldValue.increment(1),
      currentLeaning: log.leaningToward,
      leaningHistory: FieldValue.arrayUnion({
        leaning: log.leaningToward,
        date: new Date().toISOString(),
        loggedBy: log.volunteerName || "unknown",
      }),
    };

    if (log.exactWords) {
      updateData.exactWordsLog = FieldValue.arrayUnion(log.exactWords);
    }

    if (log.issuesRaised?.length) {
      updateData.topIssues = FieldValue.arrayUnion(...log.issuesRaised);
    }

    if (
      log.stageAfterContact &&
      log.stageAfterContact !== log.stageBeforeContact
    ) {
      updateData.stage = log.stageAfterContact;
      updateData.stageHistory = FieldValue.arrayUnion({
        stage: log.stageAfterContact,
        changedAt: new Date().toISOString(),
        changedBy: log.volunteerName || "unknown",
      });
    }

    await delegateRef.update(updateData);

    // ── 2. Recalculate campaignStats ──────────────────────────────────────
    await recalculateCampaignStats(db);

    // ── 3. Check milestones ────────────────────────────────────────────────
    const statsSnap = await db.collection("campaignStats").doc("live").get();
    const stageData = statsSnap.data()?.totalByStage || {};
    const committed = (stageData.committed || 0) + (stageData.locked || 0);

    const MILESTONES = [10, 20, 30, 40, 50, 53, 60, 70];
    for (const m of MILESTONES) {
      if (committed >= m) {
        const mRef = db.collection("milestones").doc(String(m));
        const existing = await mRef.get();
        if (!existing.exists) {
          await mRef.set({
            count: m,
            achievedAt: FieldValue.serverTimestamp(),
          });
          console.log(`Milestone reached: ${m} committed delegates!`);
        }
      }
    }
  }
);

/**
 * Re-aggregate all delegate documents to update campaignStats/live.
 * Called after every contact log write.
 */
async function recalculateCampaignStats(db) {
  const snap = await db.collection("delegates").get();

  const stageCounts = {};
  const leaningCounts = {};

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    // Exclude deferred, vacant, and opposing candidates from stage rollup
    if (d.isDeferred || d.isVacant || d.isOpposingCandidate) return;
    if (d.stage) {
      stageCounts[d.stage] = (stageCounts[d.stage] || 0) + 1;
    }
    if (d.currentLeaning) {
      leaningCounts[d.currentLeaning] = (leaningCounts[d.currentLeaning] || 0) + 1;
    }
  });

  await db.collection("campaignStats").doc("live").update({
    totalByStage: stageCounts,
    leaningByCandidate: leaningCounts,
    lastUpdated: FieldValue.serverTimestamp(),
  });
}
