import SurveyForm from "@/components/survey/SurveyForm";
import { volunteerSurveyQuestions } from "@/data/surveyQuestions";
import { useMock, db } from "@/lib/firebase";

export default function VolunteerSurveyPage() {
  async function handleSubmit(answers) {
    const payload = {
      respondentType: "volunteer",
      respondentId: null,
      answers,
      topIssues: answers.q1 || [],
      supportLevel: answers.q2 || "",
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
      title="Volunteer Survey"
      questions={volunteerSurveyQuestions}
      onSubmit={handleSubmit}
    />
  );
}
