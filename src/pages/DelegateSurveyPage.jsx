import SurveyForm from "@/components/survey/SurveyForm";
import { delegateSurveyQuestions } from "@/data/surveyQuestions";
import { useMock, db } from "@/lib/firebase";

export default function DelegateSurveyPage() {
  async function handleSubmit(answers) {
    const payload = {
      respondentType: "delegate",
      respondentId: null,
      name: answers.q8?.name || "Anonymous",
      email: answers.q8?.email || "",
      phone: answers.q8?.phone || "",
      answers,
      topIssues: answers.q1 || [],
      supportLevel: answers.q3 || 0,
      source: "public_link",
      submittedAt: new Date().toISOString(),
    };

    if (!useMock && db) {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      payload.submittedAt = serverTimestamp();
      await addDoc(collection(db, "surveyResponses"), payload);
    }
  }

  return (
    <SurveyForm
      title="Delegate Survey"
      questions={delegateSurveyQuestions}
      onSubmit={handleSubmit}
    />
  );
}
