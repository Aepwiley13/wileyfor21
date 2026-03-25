import { useState } from "react";
import { useMock, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { CONTACT_METHODS, OUTCOMES, CANDIDATES, ISSUES, NEXT_ACTIONS, STAGES } from "@/lib/constants";
import { calculateNextContactDate } from "@/lib/utils";

export default function ContactLogModal({ delegate, method: initialMethod, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    method: initialMethod || "call",
    outcome: "",
    leaningToward: "",
    issuesRaised: [],
    exactWords: "",
    mentionedOtherCandidate: false,
    otherCandidateNamed: "",
    wasOrdSupporter: false,
    moveStage: "",
    nextAction: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleIssue = (issue) => {
    setForm((f) => ({
      ...f,
      issuesRaised: f.issuesRaised.includes(issue)
        ? f.issuesRaised.filter((i) => i !== issue)
        : [...f.issuesRaised, issue],
    }));
  };

  const showMoveStage = form.outcome === "great" || form.outcome === "good";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.outcome) return;
    setSubmitting(true);

    const stageOrder = STAGES;
    const currentIdx = stageOrder.indexOf(delegate.stage);
    let stageAfter = delegate.stage;
    if (form.moveStage === "yes" && currentIdx < stageOrder.length - 1) {
      stageAfter = stageOrder[currentIdx + 1];
    }
    if (form.outcome === "hostile") stageAfter = "not_winnable";

    const logEntry = {
      delegateId: delegate.id,
      delegateName: delegate.name,
      volunteerId: user.uid,
      volunteerName: user.name,
      method: form.method,
      outcome: form.outcome,
      stageBeforeContact: delegate.stage,
      stageAfterContact: stageAfter,
      leaningToward: form.leaningToward,
      issuesRaised: form.issuesRaised,
      exactWords: form.exactWords,
      mentionedOtherCandidate: form.mentionedOtherCandidate,
      otherCandidateNamed: form.otherCandidateNamed || "",
      wasOrdSupporter: form.wasOrdSupporter,
      nextAction: form.nextAction,
      nextContactDate: calculateNextContactDate(form.nextAction),
      timestamp: new Date().toISOString(),
    };

    if (!useMock && db) {
      const { collection, addDoc, doc, updateDoc, arrayUnion, serverTimestamp } = await import("firebase/firestore");
      const ts = serverTimestamp();
      logEntry.timestamp = ts;
      await addDoc(collection(db, "contactLogs"), logEntry);

      // Update the delegate document so lastContactedAt persists for all volunteers
      const delegateUpdates = {
        lastContactedAt: new Date().toISOString(),
        lastContactedBy: user.name || user.displayName || user.email,
        stage: stageAfter,
        contactHistory: arrayUnion({
          date: new Date().toISOString(),
          method: form.method,
          outcome: form.outcome,
          loggedBy: user.name || user.displayName || user.email,
        }),
      };
      if (form.issuesRaised.length) {
        delegateUpdates.issuesRaised = arrayUnion(...form.issuesRaised);
      }
      if (form.exactWords) {
        delegateUpdates.exactWordsLogged = arrayUnion({
          text: form.exactWords,
          by: user.name || user.displayName || user.email,
          date: new Date().toISOString(),
        });
      }
      if (form.wasOrdSupporter) {
        delegateUpdates.wasOrdSupporter = true;
      }
      await updateDoc(doc(db, "delegates", delegate.id), delegateUpdates);
    }

    onSubmitted?.(logEntry, stageAfter);
    setSubmitting(false);
    onClose?.();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50">
        <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
          {/* Handle bar (mobile) */}
          <div className="md:hidden flex justify-center pt-3">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-condensed font-bold text-navy text-xl">
                Log Contact &mdash; {delegate.name}
              </h2>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* 1. Method */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-2">Method</legend>
              <div className="flex flex-wrap gap-2">
                {CONTACT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => set("method", m.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.method === m.value
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-gray-700 border-gray-300 hover:border-navy/40"
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 2. Outcome */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-2">How did it go?</legend>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set("outcome", o.value)}
                    className={`px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                      form.outcome === o.value
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-gray-700 border-gray-200 hover:border-navy/40"
                    }`}
                  >
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 3. Leaning toward */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-2">Who are they leaning toward?</legend>
              <select
                value={form.leaningToward}
                onChange={(e) => set("leaningToward", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              >
                <option value="">Select...</option>
                {CANDIDATES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </fieldset>

            {/* 4. Issues */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-2">Issues they raised</legend>
              <div className="flex flex-wrap gap-2">
                {ISSUES.map((issue) => (
                  <button
                    key={issue}
                    type="button"
                    onClick={() => toggleIssue(issue)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.issuesRaised.includes(issue)
                        ? "bg-coral text-white border-coral"
                        : "bg-white text-gray-600 border-gray-300 hover:border-coral/40"
                    }`}
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 5. Exact words */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                What did they say? <span className="font-normal text-gray-400">Exact words matter</span>
              </label>
              <textarea
                value={form.exactWords}
                onChange={(e) => set("exactWords", e.target.value)}
                placeholder='e.g. She said she&#39;s worried about rent and hasn&#39;t committed yet. Mentioned she knows Darin Mann.'
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 resize-none"
              />
            </div>

            {/* 6. Mentioned other candidate */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Did they mention another candidate?</label>
              <button
                type="button"
                onClick={() => set("mentionedOtherCandidate", !form.mentionedOtherCandidate)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.mentionedOtherCandidate ? "bg-navy" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.mentionedOtherCandidate ? "translate-x-5" : ""}`} />
              </button>
            </div>
            {form.mentionedOtherCandidate && (
              <input
                type="text"
                value={form.otherCandidateNamed}
                onChange={(e) => set("otherCandidateNamed", e.target.value)}
                placeholder="Which candidate?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            )}

            {/* 7. Was Ord supporter */}
            <div className="flex items-center gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Were they a James Ord supporter?</label>
                <p className="text-xs text-gray-400">Ord withdrew &mdash; his supporters are warm leads</p>
              </div>
              <button
                type="button"
                onClick={() => set("wasOrdSupporter", !form.wasOrdSupporter)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.wasOrdSupporter ? "bg-navy" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.wasOrdSupporter ? "translate-x-5" : ""}`} />
              </button>
            </div>

            {/* 8. Move stage */}
            {showMoveStage && (
              <fieldset>
                <legend className="text-sm font-semibold text-gray-700 mb-2">Move to next stage?</legend>
                <div className="flex gap-2">
                  {[
                    { v: "yes", l: "Yes" },
                    { v: "no", l: "No" },
                    { v: "not_yet", l: "Not yet" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => set("moveStage", opt.v)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.moveStage === opt.v
                          ? "bg-navy text-white border-navy"
                          : "bg-white text-gray-700 border-gray-300 hover:border-navy/40"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* 9. Next action */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-2">Next action</legend>
              <div className="grid grid-cols-2 gap-2">
                {NEXT_ACTIONS.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => set("nextAction", action)}
                    className={`px-3 py-2 rounded-lg text-sm text-left border transition-colors ${
                      form.nextAction === action
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-gray-700 border-gray-200 hover:border-navy/40"
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !form.outcome}
              className="w-full py-3 rounded-xl font-condensed font-bold text-white bg-coral hover:bg-coral/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {submitting ? "Saving..." : "Save Contact Log"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
