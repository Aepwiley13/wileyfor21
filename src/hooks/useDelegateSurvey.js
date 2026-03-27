import { useState, useEffect } from "react";
import { db, useMock } from "@/lib/firebase";

export const EMPTY_SURVEY = {
  name: "",
  neighborhood: "",
  topPriorities: [],
  westsideChallenges: [],
  rankOrder: [0, 1, 2],
  matrixAnswers: {},
  agreementAnswers: {},
  budgetTradeoff: "",
  crimeApproach: "",
  overlookedIssue: "",
  legislativeFocus: "",
  nonprofitsMentioned: "",
  livedExperience: [],
  engagementInterest: [],
  contactPreference: "",
  closingThoughts: "",
  currentStep: 0,
  completed: false,
  startedAt: null,
  completedAt: null,
  lastUpdated: null,
};

/**
 * Resolves the actual Firestore delegates/{docId} for a given Firebase auth uid.
 *
 * Two cases:
 *   1. Self-registered delegate (no prior Hub record) → doc lives at delegates/{uid}
 *   2. Matched to existing volunteer-managed record → doc has uid field set,
 *      but its Firestore ID is the original volunteer-imported ID
 *
 * Strategy: try delegates/{uid} first. If the doc doesn't exist, query the
 * collection for a doc where uid == the auth uid (set during signup matching).
 */
async function resolveDocId(uid) {
  const { doc, getDoc, collection, query, where, getDocs, limit } =
    await import("firebase/firestore");

  // Step 1 — direct lookup
  const directSnap = await getDoc(doc(db, "delegates", uid));
  if (directSnap.exists()) {
    return { docId: uid, data: directSnap.data() };
  }

  // Step 2 — query by uid field (delegate was matched to an existing Hub record)
  const q = query(
    collection(db, "delegates"),
    where("uid", "==", uid),
    limit(1)
  );
  const results = await getDocs(q);
  if (!results.empty) {
    const snap = results.docs[0];
    return { docId: snap.id, data: snap.data() };
  }

  // No record found yet — will be created on first save
  return { docId: uid, data: null };
}

export function useDelegateSurvey(uid) {
  const [survey, setSurvey] = useState(EMPTY_SURVEY);
  const [delegateDocId, setDelegateDocId] = useState(uid);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    if (useMock) {
      setLoading(false);
      return;
    }
    (async () => {
      const { docId, data } = await resolveDocId(uid);
      setDelegateDocId(docId);
      if (data?.survey) {
        setSurvey({ ...EMPTY_SURVEY, ...data.survey });
      }
      setLoading(false);
    })();
  }, [uid]);

  async function save(updates) {
    const next = { ...survey, ...updates };
    setSurvey(next);
    if (!uid || useMock) return;
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const ref = doc(db, "delegates", delegateDocId);
    const surveyToWrite = { ...next, lastUpdated: serverTimestamp() };
    if (!next.startedAt) surveyToWrite.startedAt = serverTimestamp();
    await setDoc(ref, { survey: surveyToWrite }, { merge: true });
  }

  async function complete(finalState) {
    const next = { ...finalState, completed: true };
    setSurvey(next);
    if (!uid || useMock) return;
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const ref = doc(db, "delegates", delegateDocId);
    await setDoc(
      ref,
      { survey: { ...next, completedAt: serverTimestamp(), lastUpdated: serverTimestamp() } },
      { merge: true }
    );
  }

  return { survey, save, complete, loading, delegateDocId };
}
