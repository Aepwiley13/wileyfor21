import {
  RANK_ITEMS,
  SECTION4_GROUPS,
  SECTION5_GROUPS,
  SECTION6_GROUPS,
  AGREEMENT_ITEMS,
  AGREEMENT_COLS,
  MATRIX_3COL,
  buildMatrixLookup,
} from "../data/surveyMeta";

const MATRIX_LOOKUP = buildMatrixLookup();

// Color-code matrix answers
const MATRIX_VALUE_COLORS = {
  "Very important":     "bg-navy/10 text-navy font-semibold",
  "Somewhat important": "bg-yellow-100 text-yellow-700",
  "Not a priority":     "bg-gray-100 text-gray-500",
};

const AGREEMENT_COLORS = {
  "Strongly agree":    "bg-green-100 text-green-700 font-semibold",
  "Agree":             "bg-green-50 text-green-600",
  "Disagree":          "bg-red-50 text-red-500",
  "Strongly disagree": "bg-red-100 text-red-700 font-semibold",
};

function Tag({ children, color = "bg-navy/10 text-navy" }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-1 mb-1 ${color}`}>
      {children}
    </span>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="mt-6 mb-3 pb-1 border-b border-gray-200">
      <p className="text-xs font-bold tracking-widest uppercase text-coral">{title}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}

function MatrixSection({ title, groups, sectionId, matrixAnswers }) {
  return (
    <div className="mb-5">
      <SectionHeader title={title} />
      {groups.map((group, gi) => (
        <div key={gi} className="mb-4">
          <p className="text-xs font-bold text-navy mb-2">{group.title}</p>
          <div className="space-y-1">
            {group.items.map((item, ii) => {
              const key = `${sectionId}_${gi}_${ii}`;
              const val = matrixAnswers?.[key];
              return (
                <div key={ii} className="flex items-start gap-2 text-xs">
                  <span className="flex-1 text-gray-600 leading-snug">{item}</span>
                  {val ? (
                    <span className={`px-2 py-0.5 rounded-full whitespace-nowrap ${MATRIX_VALUE_COLORS[val] || "bg-gray-100 text-gray-500"}`}>
                      {val}
                    </span>
                  ) : (
                    <span className="text-gray-300 italic">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SurveyDetailModal({ delegate, onClose }) {
  if (!delegate) return null;
  const s = delegate.survey || {};
  const completedAt = s.completedAt?.toDate?.();
  const startedAt = s.startedAt?.toDate?.();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl h-screen overflow-y-auto bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-navy text-lg leading-tight">{delegate.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {delegate.precinct} · {delegate.role}
              {s.completed ? (
                <span className="ml-2 text-green-600 font-semibold">
                  Completed {completedAt ? completedAt.toLocaleDateString() : ""}
                </span>
              ) : (
                <span className="ml-2 text-yellow-600 font-semibold">
                  In progress — step {s.currentStep ?? 0} of 10
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex-1">
          {/* ── Section 0: Intro ── */}
          <SectionHeader title="Section 0 — Intro" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name on survey">{s.name || <span className="text-gray-300">—</span>}</Field>
            <Field label="Neighborhood">{s.neighborhood || <span className="text-gray-300">—</span>}</Field>
          </div>

          {/* ── Section 1: Top Priorities ── */}
          <SectionHeader title="Section 1 — Top Priorities" />
          <Field label="Which issues matter most? (up to 3)">
            {s.topPriorities?.length > 0
              ? s.topPriorities.map((p) => <Tag key={p}>{p}</Tag>)
              : <span className="text-gray-300">—</span>}
          </Field>

          {/* ── Section 2: Westside Challenges ── */}
          <SectionHeader title="Section 2 — Westside Realities" />
          <Field label="Biggest challenges facing the Westside (up to 3)">
            {s.westsideChallenges?.length > 0
              ? s.westsideChallenges.map((c) => <Tag key={c} color="bg-coral/10 text-coral">{c}</Tag>)
              : <span className="text-gray-300">—</span>}
          </Field>

          {/* ── Section 3: Rank ── */}
          <SectionHeader title="Section 3 — Priority Ranking" />
          <Field label="Ranked order (1 = most important)">
            {s.rankOrder?.length > 0 ? (
              <ol className="list-none space-y-1">
                {s.rankOrder.map((idx, rank) => (
                  <li key={rank} className="flex items-center gap-2 text-sm">
                    <span className="font-black text-coral w-4">{rank + 1}</span>
                    <span>{RANK_ITEMS[idx] ?? `Item ${idx}`}</span>
                  </li>
                ))}
              </ol>
            ) : <span className="text-gray-300">—</span>}
          </Field>

          {/* ── Sections 4–6: Matrix ── */}
          <MatrixSection
            title="Section 4 — Issue Importance (Part 1)"
            groups={SECTION4_GROUPS}
            sectionId="4"
            matrixAnswers={s.matrixAnswers}
          />
          <MatrixSection
            title="Section 5 — Issue Importance (Part 2)"
            groups={SECTION5_GROUPS}
            sectionId="5"
            matrixAnswers={s.matrixAnswers}
          />
          <MatrixSection
            title="Section 6 — Issue Importance (Part 3)"
            groups={SECTION6_GROUPS}
            sectionId="6"
            matrixAnswers={s.matrixAnswers}
          />

          {/* ── Section 7: Agreement ── */}
          <SectionHeader title="Section 7 — Policy Direction" />
          <div className="space-y-2">
            {AGREEMENT_ITEMS.map((item, i) => {
              const val = s.agreementAnswers?.[`ag_${i}`];
              return (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="flex-1 text-gray-600 leading-snug">{item}</span>
                  {val ? (
                    <span className={`px-2 py-0.5 rounded-full whitespace-nowrap ${AGREEMENT_COLORS[val] || "bg-gray-100 text-gray-500"}`}>
                      {val}
                    </span>
                  ) : (
                    <span className="text-gray-300 italic">—</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Section 8: Tradeoffs & Open Questions ── */}
          <SectionHeader title="Section 8 — Tradeoffs & Open Questions" />
          <Field label="Budget priority">
            {s.budgetTradeoff || <span className="text-gray-300">—</span>}
          </Field>
          <Field label="Crime approach">
            {s.crimeApproach || <span className="text-gray-300">—</span>}
          </Field>
          <Field label="Most overlooked issue in HD21">
            {s.overlookedIssue || <span className="text-gray-300">—</span>}
          </Field>
          <Field label="Legislative session focus">
            {s.legislativeFocus || <span className="text-gray-300">—</span>}
          </Field>
          <Field label="Nonprofits to support">
            {s.nonprofitsMentioned || <span className="text-gray-300">—</span>}
          </Field>

          {/* ── Section 9: Lived Experience ── */}
          <SectionHeader title="Section 9 — Lived Experience" />
          <Field label="Issues directly affecting them or their household">
            {s.livedExperience?.length > 0
              ? s.livedExperience.map((e) => <Tag key={e} color="bg-purple-100 text-purple-700">{e}</Tag>)
              : <span className="text-gray-300">—</span>}
          </Field>

          {/* ── Section 10: Stay Involved ── */}
          <SectionHeader title="Section 10 — Stay Involved" />
          <Field label="Engagement interest">
            {s.engagementInterest?.length > 0
              ? s.engagementInterest.map((e) => <Tag key={e} color="bg-green-100 text-green-700">{e}</Tag>)
              : <span className="text-gray-300">—</span>}
          </Field>
          <Field label="Preferred contact method">
            {s.contactPreference || <span className="text-gray-300">—</span>}
          </Field>
          <Field label="Closing thoughts">
            {s.closingThoughts || <span className="text-gray-300">—</span>}
          </Field>

          {/* ── Metadata ── */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
            {startedAt && <p>Started: {startedAt.toLocaleString()}</p>}
            {completedAt && <p>Completed: {completedAt.toLocaleString()}</p>}
            {delegate.engagementTier && (
              <p>Engagement tier (auto-tagged): <strong className="text-gray-600">{delegate.engagementTier}</strong></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
