import CallScriptWizard from "@/components/survey/CallScriptWizard";
import { useMock, db } from "@/lib/firebase";

export default function DelegateSurveyPage() {
  async function handleSubmit({ stage, method, notes }) {
    const payload = {
      type: "call_script",
      stage,
      method,
      notes,
      submittedAt: new Date().toISOString(),
    };

    if (!useMock && db) {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      payload.submittedAt = serverTimestamp();
      await addDoc(collection(db, "callScriptLogs"), payload);
    }
  }

  return <CallScriptWizard stage="connect" onSubmit={handleSubmit} />;
}
