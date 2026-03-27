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

export function useDelegateSurvey(uid) {
  const [survey, setSurvey] = useState(EMPTY_SURVEY);
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
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "delegates", uid));
      if (snap.exists() && snap.data().survey) {
        setSurvey({ ...EMPTY_SURVEY, ...snap.data().survey });
      }
      setLoading(false);
    })();
  }, [uid]);

  async function save(updates) {
    const next = { ...survey, ...updates };
    setSurvey(next);
    if (!uid || useMock) return;
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const ref = doc(db, "delegates", uid);
    // Write startedAt only once
    const surveyToWrite = { ...next, lastUpdated: serverTimestamp() };
    if (!next.startedAt) {
      surveyToWrite.startedAt = serverTimestamp();
    }
    await setDoc(ref, { survey: surveyToWrite }, { merge: true });
  }

  async function complete(finalState) {
    const next = { ...finalState, completed: true };
    setSurvey(next);
    if (!uid || useMock) return;
    const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
    const ref = doc(db, "delegates", uid);
    await setDoc(
      ref,
      { survey: { ...next, completedAt: serverTimestamp(), lastUpdated: serverTimestamp() } },
      { merge: true }
    );
  }

  return { survey, save, complete, loading };
}
