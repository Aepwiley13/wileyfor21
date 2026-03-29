import { useState } from "react";
import { callScripts } from "@/data/surveyQuestions";
import { CALL_SCRIPT_STAGES } from "@/lib/constants";

export default function CallScriptWizard({ stage = "connect", onSubmit }) {
  const steps = callScripts[stage] ?? [];
  const stageInfo = CALL_SCRIPT_STAGES[stage];

  const [currentStep, setCurrentStep] = useState(0);
  const [notes, setNotes] = useState({});
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  function setNote(id, val) {
    setNotes((n) => ({ ...n, [id]: val }));
  }

  function handleNext() {
    if (isLast) {
      setReviewing(true);
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (reviewing) {
      setReviewing(false);
    } else {
      setCurrentStep((s) => Math.max(0, s - 1));
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit({ stage, method: "call", notes });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="font-bold text-[#1B2B4B] text-2xl mb-2">Call logged</h2>
          <p className="text-gray-500 text-sm">Notes saved. Thanks for making the call.</p>
        </div>
      </div>
    );
  }

  if (reviewing) {
    return (
      <div className="min-h-screen bg-[#F5F2EC]">
        {/* Progress — all filled */}
        <ProgressBar total={steps.length} current={steps.length} />

        <div className="max-w-lg mx-auto px-4 pt-5 pb-24 space-y-4">
          <div className="mb-2">
            <p className="text-xs font-semibold tracking-widest text-[#3A7D44] uppercase mb-1">
              Review call
            </p>
            <h2 className="font-bold text-[#1B2B4B] text-2xl">Your notes</h2>
          </div>

          {steps.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold tracking-widest text-[#3A7D44] uppercase mb-1">
                {s.stepLabel}
              </p>
              <p className="font-semibold text-[#1B2B4B] text-sm mb-2">{s.title}</p>
              {notes[s.id] ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes[s.id]}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No notes</p>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBack}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-[#3A7D44] text-white text-sm font-bold hover:bg-[#2f6838] disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : "Save call log"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EC]">
      <ProgressBar total={steps.length} current={currentStep} />

      <div className="max-w-lg mx-auto px-4 pt-5 pb-24">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          {/* Step label + title */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#3A7D44] uppercase mb-1">
              Step {currentStep + 1} — {step.stepLabel}
            </p>
            <h2 className="font-bold text-[#1B2B4B] text-xl">{step.title}</h2>
          </div>

          {/* Script blockquote */}
          <div className="border-l-4 border-[#3A7D44] pl-4 bg-[#F5F2EC] rounded-r-lg py-3 pr-3">
            <p className="text-sm text-gray-800 leading-relaxed">{step.script}</p>
          </div>

          {/* Tips */}
          <ul className="space-y-1">
            {step.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-[#3A7D44] mt-0.5 shrink-0">▸</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          {/* Notes textarea */}
          <textarea
            value={notes[step.id] || ""}
            onChange={(e) => setNote(step.id, e.target.value)}
            placeholder={step.notesPlaceholder}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 resize-none bg-[#FAFAF8]"
          />

          {/* Navigation */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl bg-[#1B2B4B] text-white text-sm font-bold hover:bg-[#162240] transition-colors"
            >
              {isLast ? "Review call →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ total, current }) {
  return (
    <div className="sticky top-0 z-10 bg-[#F5F2EC] px-4 pt-4 pb-3">
      <div className="max-w-lg mx-auto flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i <= current ? "#3A7D44" : "#D1D5DB" }}
          />
        ))}
      </div>
    </div>
  );
}
