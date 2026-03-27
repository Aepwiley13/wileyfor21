/**
 * Cloud Function: staleDelegateSurveyAlert (scheduled)
 *
 * Runs daily. Finds delegates who:
 *   - Started the survey (survey.startedAt is set)
 *   - Have NOT completed it (survey.completed != true)
 *   - Started more than 48 hours ago
 *
 * Writes surveyFollowUpNeeded: true to the delegate doc so volunteers
 * can filter the Hub for "incomplete survey — follow up" delegates.
 * Also clears the flag when a survey is completed.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

try { initializeApp(); } catch (_) {}

// ── Scheduled: runs every day at 8am MT ──────────────────────────────────────

exports.staleDelegateSurveyAlert = onSchedule("0 14 * * *", async () => {
  const db = getFirestore();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const cutoffTs = Timestamp.fromDate(cutoff);

  const snap = await db
    .collection("delegates")
    .where("survey.startedAt", "<=", cutoffTs)
    .get();

  const batch = db.batch();
  let flagged = 0;
  let cleared = 0;

  snap.forEach((doc) => {
    const data = doc.data();
    const completed = data.survey?.completed === true;
    const alreadyFlagged = data.surveyFollowUpNeeded === true;

    if (!completed && !alreadyFlagged) {
      batch.update(doc.ref, { surveyFollowUpNeeded: true });
      flagged++;
    } else if (completed && alreadyFlagged) {
      // Clear the flag if they've since completed
      batch.update(doc.ref, { surveyFollowUpNeeded: FieldValue.delete() });
      cleared++;
    }
  });

  if (flagged > 0 || cleared > 0) {
    await batch.commit();
  }

  console.log(`staleDelegateSurveyAlert: flagged=${flagged}, cleared=${cleared}`);
});

// ── Trigger: clear flag immediately when survey completes ─────────────────────

exports.clearSurveyFollowUpFlag = onDocumentWritten(
  "delegates/{delegateId}",
  async (event) => {
    const before = event.data.before?.data();
    const after = event.data.after?.data();

    // Only act when survey.completed transitions false → true
    if (!after?.survey?.completed) return;
    if (before?.survey?.completed === true) return;
    // Only clear if the flag was set
    if (!after?.surveyFollowUpNeeded) return;

    await event.data.after.ref.update({
      surveyFollowUpNeeded: FieldValue.delete(),
    });
  }
);
