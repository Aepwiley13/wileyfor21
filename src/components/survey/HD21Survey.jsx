import { useState } from "react";

// ─── Survey Data ───────────────────────────────────────────────────────────

const RANK_ITEMS = [
  "Affordability & cost of living",
  "Healthcare access",
  "Westside development & investment",
];

const TOP_PRIORITIES_OPTIONS = [
  "Cost of living & affordability",
  "Access to healthcare (including mental health)",
  "Westside economic development & investment",
  "Housing affordability & displacement",
  "Air quality & environmental health",
  "Water — Great Salt Lake & water rights",
  "Public education funding",
  "Disability services & accessibility",
  "Supporting seniors — housing, healthcare & services",
  "Violence against women & domestic safety",
  "Clean energy & utility costs",
  "Crime prevention & community safety",
  "Investing in Westside nonprofits & community organizations",
  "Homelessness & shelter access",
  "Transportation & transit access",
  "Wages & job opportunities",
  "Immigration & community protection",
  "Government accountability & local control",
];

const WESTSIDE_CHALLENGES_OPTIONS = [
  "Worse air quality and health risks compared to the rest of the city",
  "Being cut off from downtown by freight rail — the Rio Grande Plan can fix this",
  "Rising housing costs and longtime residents being displaced",
  "Lack of economic investment compared to the Eastside",
  "Limited public transit — not enough routes, not frequent enough",
  "The Inland Port and industrial expansion threatening our neighborhoods",
  "Underfunded schools and fewer student support resources",
  "Inadequate services and accessibility for people with disabilities",
  "Seniors being pushed out of their homes by rising costs",
  "Domestic violence and a shortage of shelter and support services",
  "Property crime and public safety concerns, especially at night",
  "Westside nonprofits underfunded and stretched too thin",
  "Access to healthcare clinics and mental health services",
  "Aging infrastructure — roads, sidewalks, lighting, pipes",
];

const MATRIX_3COL = ["Very important", "Somewhat important", "Not a priority"];

const SECTION4_GROUPS = [
  {
    title: "Housing & Affordability",
    items: [
      "Expanding affordable housing options on the Westside",
      "Preventing displacement of longtime Westside residents",
      "Tenant opportunity to purchase — renters buying their buildings",
      "Property tax relief to keep seniors in their homes",
      "Expanding cooperative housing programs",
    ],
  },
  {
    title: "Supporting Seniors",
    items: [
      "Expanding and protecting affordable senior housing",
      "Strengthening the property tax deferral program for seniors",
      "Access to in-home care and aging services on the Westside",
      "Protecting Medicaid and Medicare from cuts",
      "Dedicated senior resource centers on the Westside",
    ],
  },
  {
    title: "Violence Against Women & Domestic Safety",
    items: [
      "Increasing funding for domestic violence shelters and crisis services",
      "Stronger legal protections and faster court response for DV survivors",
      "Mandatory DV training for law enforcement and schools",
      "Support services for survivors — housing, counseling, employment",
      "Addressing the backlog of untested sexual assault evidence kits",
    ],
  },
  {
    title: "Water — Great Salt Lake & Water Rights",
    items: [
      "Leasing water shares to restore flow to the Great Salt Lake",
      "Mandating water conservation across agricultural and urban users",
      "Holding industrial users accountable for overconsumption",
      "Investing in water infrastructure and pipe upgrades on the Westside",
      "Stopping further depletion of the lake's tributaries",
    ],
  },
];

const SECTION5_GROUPS = [
  {
    title: "Crime Prevention & Community Safety",
    items: [
      "Community-based crime prevention programs (youth, mentorship, intervention)",
      "Improved street lighting and infrastructure in high-crime areas",
      "Better coordination between SLCPD and Westside community organizations",
      "Addressing property crime — vehicle theft, break-ins, vandalism",
      "Civilian oversight boards for police accountability",
      "Requiring body cameras for all law enforcement officers",
      "Community policing — officers known by the neighborhood",
      "Addressing root causes of crime: poverty, mental health, addiction",
    ],
  },
  {
    title: "Investing in Nonprofits & Community Organizations",
    items: [
      "Dedicated state funding stream for Westside community nonprofits",
      "Multi-year grant commitments — not one-time awards — so orgs can plan",
      "Supporting nonprofits providing food security, shelter, and job training",
      "Funding organizations that serve immigrant and refugee communities",
      "Investing in youth programs, after-school activities, and mentorship orgs",
      "Supporting arts, culture, and community enrichment organizations",
      "Reducing bureaucratic barriers for small nonprofits accessing grants",
    ],
  },
  {
    title: "Disability Services & Accessibility",
    items: [
      "Protecting disability services funding (tied to progressive tax structure)",
      "Hiring more full-time paraprofessionals in public schools",
      "Improving physical accessibility across Westside neighborhoods",
      "Expanding mental health and developmental disability support programs",
      "Ensuring school vouchers don't defund special education",
    ],
  },
  {
    title: "Environment & Clean Energy",
    items: [
      "Transitioning to 100% renewable energy for Salt Lake City by 2030",
      "Expanding rooftop solar access for Westside homes and small businesses",
      "Scaling fines for industrial polluters affecting Westside air quality",
      "Stopping Inland Port expansion threatening neighborhood health",
      "Opposing the new state tax on wind and solar energy facilities",
    ],
  },
];

const SECTION6_GROUPS = [
  {
    title: "Education",
    items: [
      "Increasing per-pupil school funding (Utah is 49th in the nation)",
      "Opposing private school vouchers that pull funds from public schools",
      "Free school meals for all students",
      "More paraprofessionals and smaller class sizes",
      "Repeal book bans in public schools",
    ],
  },
  {
    title: "Healthcare",
    items: [
      "Expanding access to mental healthcare",
      "Restoring reproductive healthcare access",
      "Protecting gender-affirming care",
      "Expanding postpartum support and maternal health services",
    ],
  },
  {
    title: "Transportation",
    items: [
      "Advancing the Rio Grande Plan (burying rails, connecting the Westside)",
      "Expanding and increasing frequency of UTA routes on the Westside",
      "Fighting state preemption of local transit planning (SB 242)",
      "Accessible transit options for seniors and people with disabilities",
    ],
  },
  {
    title: "Labor & Economy",
    items: [
      "Raising the state minimum wage (no increase since 2009)",
      "Strengthening union and collective bargaining rights",
      "Bringing living-wage jobs to the Westside",
      "Establishing minimum wage for prison labor",
    ],
  },
  {
    title: "Community & Immigration",
    items: [
      "Opposing expanded ICE enforcement in our neighborhoods",
      "Protecting immigrants and diaspora communities from profiling",
      "Community-centered approach to homelessness and addiction",
    ],
  },
];

const AGREEMENT_ITEMS = [
  "Utah should adopt a progressive tax structure to better fund education and disability services",
  "Crime prevention requires investing in communities, not just policing",
  "Westside nonprofits need sustained, multi-year state funding — not just private grants",
  "The state should take immediate action to restore Great Salt Lake water levels",
  "Domestic violence is a public health crisis that requires dedicated state funding",
  "The Westside deserves the same infrastructure and energy investment as the Eastside",
  "Housing decisions — including rent stabilization — should be made locally",
  "ICE enforcement is making our community less safe, not more",
  "Tenants should have the first right to purchase when a landlord sells",
  "The state should support Salt Lake City's 2030 renewable energy goal, not undermine it",
  "Healthcare decisions should be made by patients and doctors, not politicians",
  "Seniors on fixed incomes need stronger protections from rising housing costs",
  "School voucher programs that divert funds from special education must be opposed",
];

const LIVED_EXPERIENCE_OPTIONS = [
  "Housing affordability or displacement",
  "Crime or public safety concerns",
  "Disability services or accessibility needs",
  "Domestic violence or personal safety",
  "Senior care or aging services",
  "Water or air quality health impacts",
  "Reliance on a local nonprofit or community organization",
  "Immigration status or ICE enforcement concerns",
  "Prefer not to say",
];

const ENGAGEMENT_OPTIONS = [
  "Attend community discussion events",
  "Volunteer on the campaign",
  "Help shape policy ideas and give ongoing feedback",
  "Participate in door-knocking or outreach",
  "Just keep me informed",
];

const TOTAL_STEPS = 11; // 0–10, plus thank-you at 11

// ─── Sub-components ────────────────────────────────────────────────────────

function ProgressBar({ step }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Section {step} of {TOTAL_STEPS}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-coral rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeading({ title }) {
  return (
    <div className="mb-5 pb-3 border-b border-gray-200">
      <p className="text-xs font-bold tracking-widest uppercase text-coral">{title}</p>
    </div>
  );
}

function CheckboxGroup({ options, selected, onChange, max, label }) {
  function toggle(opt) {
    if (selected.includes(opt)) {
      onChange(selected.filter((o) => o !== opt));
    } else if (selected.length < max) {
      onChange([...selected, opt]);
    }
  }
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3">
        {label}{" "}
        {max && (
          <span className="text-gray-400 font-normal">
            ({selected.length} of {max} selected)
          </span>
        )}
      </p>
      <div className="space-y-2">
        {options.map((opt) => {
          const checked = selected.includes(opt);
          const disabled = !checked && max && selected.length >= max;
          return (
            <label
              key={opt}
              className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                checked
                  ? "border-navy/40 bg-navy/5"
                  : disabled
                  ? "border-gray-100 opacity-50 cursor-not-allowed"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(opt)}
                className="accent-navy mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 leading-snug">{opt}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function RankList({ order, onChange }) {
  function move(idx, dir) {
    const next = [...order];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange(next);
  }
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3">
        Use the arrows to rank in order of importance (1 = most important)
      </p>
      <div className="space-y-2">
        {order.map((itemIdx, rank) => (
          <div
            key={itemIdx}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
          >
            <span className="text-xl font-black text-coral w-6 flex-shrink-0">{rank + 1}</span>
            <span className="flex-1 text-sm text-gray-700">{RANK_ITEMS[itemIdx]}</span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(rank, -1)}
                disabled={rank === 0}
                className="text-gray-400 hover:text-navy disabled:opacity-20 leading-none px-1"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(rank, 1)}
                disabled={rank === order.length - 1}
                className="text-gray-400 hover:text-navy disabled:opacity-20 leading-none px-1"
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatrixTable({ groups, sectionId, answers, onChange, columns }) {
  return (
    <div className="space-y-8">
      {groups.map((group, gi) => (
        <div key={gi}>
          <h3 className="font-semibold text-navy text-sm mb-3">{group.title}</h3>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr>
                  <th className="text-left py-2 font-medium text-gray-500 text-xs w-1/2 px-1" />
                  {columns.map((col) => (
                    <th key={col} className="text-center py-2 font-medium text-gray-500 text-xs px-2 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.items.map((item, ii) => {
                  const key = `${sectionId}_${gi}_${ii}`;
                  return (
                    <tr key={ii} className={ii % 2 === 0 ? "bg-gray-50/50" : ""}>
                      <td className="py-2.5 pr-4 text-gray-700 leading-snug px-1">{item}</td>
                      {columns.map((col) => (
                        <td key={col} className="text-center py-2.5 px-2">
                          <input
                            type="radio"
                            name={key}
                            checked={answers[key] === col}
                            onChange={() => onChange(key, col)}
                            className="accent-navy w-4 h-4"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function RadioGroup({ options, value, onChange, name }) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
            value === opt ? "border-navy/40 bg-navy/5" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="accent-navy mt-0.5 flex-shrink-0"
          />
          <span className="text-sm text-gray-700 leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function OpenText({ value, onChange, placeholder, label, optional }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}{" "}
        {optional && <span className="text-gray-400 font-normal">(optional)</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder || "Type your response here..."}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 resize-none"
      />
    </div>
  );
}

function NavButtons({ onBack, onNext, onSubmit, step, saving }) {
  return (
    <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
      {step > 0 && (
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
      )}
      <div className="flex-1" />
      {onSubmit ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="px-8 py-2.5 rounded-xl bg-coral text-white font-condensed font-bold text-base hover:bg-coral/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Submitting..." : "Submit"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={saving}
          className="px-8 py-2.5 rounded-xl bg-navy text-white font-condensed font-bold text-base hover:bg-navy/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Continue →"}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function HD21Survey({ initialState, onSave, onComplete }) {
  const [state, setState] = useState(initialState);
  const [step, setStep] = useState(initialState?.currentStep ?? 0);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function updateMatrix(key, value) {
    setState((prev) => ({
      ...prev,
      matrixAnswers: { ...prev.matrixAnswers, [key]: value },
    }));
  }

  function updateAgreement(key, value) {
    setState((prev) => ({
      ...prev,
      agreementAnswers: { ...prev.agreementAnswers, [key]: value },
    }));
  }

  async function handleNext() {
    setSaving(true);
    const nextStep = step + 1;
    const updated = { ...state, currentStep: nextStep };
    setState(updated);
    await onSave(updated);
    setStep(nextStep);
    setSaving(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleBack() {
    const prevStep = step - 1;
    setStep(prevStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setSaving(true);
    const final = { ...state, completed: true };
    await onComplete(final);
    setStep(TOTAL_STEPS + 1);
    setSaving(false);
  }

  // ── Thank-you ──
  if (step > TOTAL_STEPS) {
    return (
      <div className="text-center py-12 px-4 max-w-lg mx-auto">
        <div className="text-5xl mb-6 text-coral font-black">✓</div>
        <h2 className="font-condensed font-black text-navy text-3xl mb-4">
          Thank you for your input.
        </h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Your responses are recorded and will directly shape the priorities and legislation I
          pursue if elected to represent House District 21.
        </p>
        <p className="font-semibold text-navy">
          — Aaron Wiley, Candidate for Utah House District 21
        </p>
      </div>
    );
  }

  // ── Step 0: Intro ──
  if (step === 0) {
    return (
      <div>
        <div className="bg-navy/5 border border-navy/10 rounded-xl p-4 mb-6 text-sm text-gray-700 leading-relaxed italic">
          "Thank you for taking a few minutes to share your perspective. I'm running to represent
          House District 21 and want this campaign — and the policies I fight for — shaped directly
          by delegates from our community, especially here on the Westside. Your input will directly
          influence what I prioritize in the legislature."
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your name <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              required
              value={state.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your neighborhood{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={state.neighborhood}
              onChange={(e) => update("neighborhood", e.target.value)}
              placeholder="e.g. Rose Park, Fairpark, Poplar Grove, Glendale..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>
        </div>

        <NavButtons step={step} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 1: Top Priorities ──
  if (step === 1) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 1 of 10 — Top Priorities" />
        <CheckboxGroup
          label="Which issues matter most to you in House District 21?"
          options={TOP_PRIORITIES_OPTIONS}
          selected={state.topPriorities}
          onChange={(v) => update("topPriorities", v)}
          max={3}
        />
        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 2: Westside Challenges ──
  if (step === 2) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 2 of 10 — Westside Realities" />
        <CheckboxGroup
          label="What are the biggest challenges facing the Westside right now?"
          options={WESTSIDE_CHALLENGES_OPTIONS}
          selected={state.westsideChallenges}
          onChange={(v) => update("westsideChallenges", v)}
          max={3}
        />
        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 3: Rank ──
  if (step === 3) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 3 of 10 — Rank Your Priorities" />
        <RankList order={state.rankOrder} onChange={(v) => update("rankOrder", v)} />
        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 4: Matrix Part 1 ──
  if (step === 4) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 4 of 10 — Issue Importance (Part 1)" />
        <p className="text-sm text-gray-500 mb-5">
          For each item, select: Very important / Somewhat important / Not a priority
        </p>
        <MatrixTable
          groups={SECTION4_GROUPS}
          sectionId="4"
          answers={state.matrixAnswers}
          onChange={updateMatrix}
          columns={MATRIX_3COL}
        />
        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 5: Matrix Part 2 ──
  if (step === 5) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 5 of 10 — Issue Importance (Part 2)" />
        <p className="text-sm text-gray-500 mb-5">
          For each item, select: Very important / Somewhat important / Not a priority
        </p>
        <MatrixTable
          groups={SECTION5_GROUPS}
          sectionId="5"
          answers={state.matrixAnswers}
          onChange={updateMatrix}
          columns={MATRIX_3COL}
        />
        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 6: Matrix Part 3 ──
  if (step === 6) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 6 of 10 — Issue Importance (Part 3)" />
        <p className="text-sm text-gray-500 mb-5">
          For each item, select: Very important / Somewhat important / Not a priority
        </p>
        <MatrixTable
          groups={SECTION6_GROUPS}
          sectionId="6"
          answers={state.matrixAnswers}
          onChange={updateMatrix}
          columns={MATRIX_3COL}
        />
        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 7: Agreement Matrix ──
  if (step === 7) {
    const AG_COLS = ["Strongly agree", "Agree", "Disagree", "Strongly disagree"];
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 7 of 10 — Policy Direction" />
        <p className="text-sm text-gray-500 mb-5">
          How much do you agree with the following statements?
        </p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr>
                <th className="text-left py-2 font-medium text-gray-500 text-xs w-1/2 px-1" />
                {AG_COLS.map((col) => (
                  <th key={col} className="text-center py-2 font-medium text-gray-500 text-xs px-1 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGREEMENT_ITEMS.map((item, i) => {
                const key = `ag_${i}`;
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-gray-50/50" : ""}>
                    <td className="py-2.5 pr-4 text-gray-700 leading-snug px-1">{item}</td>
                    {AG_COLS.map((col) => (
                      <td key={col} className="text-center py-2.5 px-1">
                        <input
                          type="radio"
                          name={key}
                          checked={state.agreementAnswers[key] === col}
                          onChange={() => updateAgreement(key, col)}
                          className="accent-navy w-4 h-4"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 8: Tradeoffs & Open Questions ──
  if (step === 8) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 8 of 10 — Tradeoffs & Open Questions" />

        <div className="space-y-7">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              If the state had limited resources, which should come first?
            </p>
            <RadioGroup
              name="budgetTradeoff"
              options={[
                "Lower taxes across the board",
                "Increased investment in education, disability services, seniors, and community programs",
                "A balanced approach — modest tax changes with targeted investment",
                "Reduce government spending first, then reassess",
              ]}
              value={state.budgetTradeoff}
              onChange={(v) => update("budgetTradeoff", v)}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              When it comes to crime on the Westside, what approach do you believe is most effective?
            </p>
            <RadioGroup
              name="crimeApproach"
              options={[
                "More police presence and enforcement",
                "More investment in youth programs, jobs, and mental health",
                "A balanced approach — both enforcement and community investment",
                "Focus on addressing root causes like poverty and addiction first",
              ]}
              value={state.crimeApproach}
              onChange={(v) => update("crimeApproach", v)}
            />
          </div>

          <OpenText
            label="What issue do you feel is most overlooked in HD21?"
            value={state.overlookedIssue}
            onChange={(v) => update("overlookedIssue", v)}
          />

          <OpenText
            label="What would you most want your representative to focus on in the next legislative session?"
            value={state.legislativeFocus}
            onChange={(v) => update("legislativeFocus", v)}
          />

          <OpenText
            label="Are there specific nonprofits or community organizations on the Westside you believe need more support?"
            value={state.nonprofitsMentioned}
            onChange={(v) => update("nonprofitsMentioned", v)}
            placeholder="Name any organizations you'd like to see better funded or supported..."
            optional
          />
        </div>

        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 9: Lived Experience ──
  if (step === 9) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 9 of 10 — Lived Experience" />
        <CheckboxGroup
          label="Do any of these issues directly affect you or someone in your household? (select all that apply)"
          options={LIVED_EXPERIENCE_OPTIONS}
          selected={state.livedExperience}
          onChange={(v) => update("livedExperience", v)}
          max={LIVED_EXPERIENCE_OPTIONS.length}
        />
        <NavButtons step={step} onBack={handleBack} onNext={handleNext} saving={saving} />
      </div>
    );
  }

  // ── Step 10: Stay Involved ──
  if (step === 10) {
    return (
      <div>
        <ProgressBar step={step} />
        <SectionHeading title="Section 10 of 10 — Stay Involved" />

        <div className="space-y-7">
          <CheckboxGroup
            label="How would you like to stay involved? (select all that apply)"
            options={ENGAGEMENT_OPTIONS}
            selected={state.engagementInterest}
            onChange={(v) => update("engagementInterest", v)}
            max={ENGAGEMENT_OPTIONS.length}
          />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Preferred contact method{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            <RadioGroup
              name="contactPreference"
              options={["Email", "Text/phone", "Either is fine"]}
              value={state.contactPreference}
              onChange={(v) => update("contactPreference", v)}
            />
          </div>

          <OpenText
            label="Anything else you want me to know?"
            value={state.closingThoughts}
            onChange={(v) => update("closingThoughts", v)}
            placeholder="Open to anything — questions, concerns, ideas..."
            optional
          />
        </div>

        <NavButtons step={step} onBack={handleBack} onSubmit={handleSubmit} saving={saving} />
      </div>
    );
  }

  return null;
}
