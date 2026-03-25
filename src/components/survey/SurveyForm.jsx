import { useState } from "react";

export default function SurveyForm({ questions, onSubmit, title }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const answered = Object.keys(answers).filter((k) => {
    const val = answers[k];
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.values(val).some(Boolean);
    return val !== "" && val !== undefined;
  }).length;
  const progress = Math.round((answered / questions.length) * 100);

  function set(id, val) {
    setAnswers((a) => ({ ...a, [id]: val }));
  }

  function toggleMulti(id, option, maxSelect) {
    setAnswers((a) => {
      const current = a[id] || [];
      if (current.includes(option)) {
        return { ...a, [id]: current.filter((o) => o !== option) };
      }
      if (maxSelect && current.length >= maxSelect) return a;
      return { ...a, [id]: [...current, option] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(answers);
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-4xl mb-4">&#9989;</div>
          <h2 className="font-condensed font-bold text-navy text-2xl mb-2">Thank You</h2>
          <p className="text-gray-600">Aaron appreciates your time and will be in touch.</p>
          <button
            onClick={() => {
              const text = `Take the ${title} survey: ${window.location.href}`;
              if (navigator.share) {
                navigator.share({ title, text, url: window.location.href });
              } else {
                navigator.clipboard.writeText(text);
              }
            }}
            className="mt-6 px-6 py-2.5 bg-navy text-white rounded-xl font-condensed font-bold hover:bg-navy-dark transition-colors"
          >
            Share this survey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{title}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-coral rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-6 pb-24">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              <span className="text-coral mr-1">Q{i + 1}.</span> {q.label}
            </p>

            {/* Radio */}
            {q.type === "radio" && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => set(q.id, opt)}
                      className="w-4 h-4 text-navy accent-navy"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
                {q.allowOther && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id]?.startsWith("Other:")}
                      onChange={() => set(q.id, "Other: ")}
                      className="w-4 h-4 text-navy accent-navy"
                    />
                    <span className="text-sm text-gray-700">Other:</span>
                    {answers[q.id]?.startsWith("Other:") && (
                      <input
                        type="text"
                        value={answers[q.id].replace("Other: ", "")}
                        onChange={(e) => set(q.id, `Other: ${e.target.value}`)}
                        className="flex-1 border-b border-gray-300 text-sm px-1 py-0.5 focus:outline-none focus:border-navy"
                        autoFocus
                      />
                    )}
                  </label>
                )}
                {/* Follow-up */}
                {q.followUp && answers[q.id] === q.followUp.trigger && (
                  <input
                    type="text"
                    placeholder={q.followUp.label}
                    value={answers[`${q.id}_followup`] || ""}
                    onChange={(e) => set(`${q.id}_followup`, e.target.value)}
                    className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                  />
                )}
              </div>
            )}

            {/* Multi-select */}
            {q.type === "multiselect" && (
              <div className="space-y-2">
                {q.maxSelect && (
                  <p className="text-xs text-gray-400 mb-1">Select up to {q.maxSelect}</p>
                )}
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(answers[q.id] || []).includes(opt)}
                      onChange={() => toggleMulti(q.id, opt, q.maxSelect)}
                      className="w-4 h-4 text-navy accent-navy rounded"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
                {q.allowOther && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={(answers[q.id] || []).some((v) => v.startsWith("Other:"))}
                      onChange={() => {
                        const current = answers[q.id] || [];
                        if (current.some((v) => v.startsWith("Other:"))) {
                          set(q.id, current.filter((v) => !v.startsWith("Other:")));
                        } else {
                          set(q.id, [...current, "Other: "]);
                        }
                      }}
                      className="w-4 h-4 text-navy accent-navy rounded"
                    />
                    <span className="text-sm text-gray-700">Other:</span>
                    <input
                      type="text"
                      value={(answers[q.id] || []).find((v) => v.startsWith("Other:"))?.replace("Other: ", "") || ""}
                      onChange={(e) => {
                        const current = (answers[q.id] || []).filter((v) => !v.startsWith("Other:"));
                        set(q.id, [...current, `Other: ${e.target.value}`]);
                      }}
                      className="flex-1 border-b border-gray-300 text-sm px-1 py-0.5 focus:outline-none focus:border-navy"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Text */}
            {q.type === "text" && (
              <input
                type="text"
                value={answers[q.id] || ""}
                onChange={(e) => set(q.id, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            )}

            {/* Textarea */}
            {q.type === "textarea" && (
              <textarea
                value={answers[q.id] || ""}
                onChange={(e) => set(q.id, e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 resize-none"
              />
            )}

            {/* Scale */}
            {q.type === "scale" && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>{q.minLabel}</span>
                  <span>{q.maxLabel}</span>
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set(q.id, n)}
                      className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-colors ${
                        answers[q.id] === n
                          ? "bg-navy text-white border-navy"
                          : "bg-white text-gray-700 border-gray-300 hover:border-navy/40"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact fields */}
            {q.type === "contact" && (
              <div className="space-y-3">
                {q.fields.map((field) => (
                  <div key={field}>
                    <label className="text-xs text-gray-500 capitalize block mb-1">{field}</label>
                    <input
                      type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                      value={(answers[q.id] || {})[field] || ""}
                      onChange={(e) =>
                        set(q.id, { ...(answers[q.id] || {}), [field]: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl font-condensed font-bold text-white bg-coral hover:bg-coral/90 disabled:opacity-50 transition-colors text-lg"
        >
          {submitting ? "Submitting..." : "Submit Survey"}
        </button>
      </form>
    </div>
  );
}
