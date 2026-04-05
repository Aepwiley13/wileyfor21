import { useState } from "react";
import StageBadge from "@/components/ui/StageBadge";
import { daysSince, timeAgo } from "@/lib/utils";
import { getRecommendedScript, OBJECTIONS, TEXT_TEMPLATES } from "@/lib/scripts";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="text-xs text-navy font-medium px-2 py-1 border border-navy/20 rounded hover:bg-navy/5 transition-colors shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SurveyInsights({ survey }) {
  if (!survey || (!survey.completed && !survey.currentStep)) return null;

  const hasPriorities = survey.topPriorities?.length > 0;
  const hasChallenges = survey.westsideChallenges?.length > 0;
  const hasEngagement = survey.engagementInterest?.length > 0;
  const hasOpenText = survey.overlookedIssue || survey.legislativeFocus || survey.closingThoughts;
  const isVolunteer = survey.engagementInterest?.includes("Volunteer on the campaign");

  return (
    <section className="bg-navy/5 border border-navy/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-condensed font-bold text-navy text-base">Survey Answers</h3>
        {survey.completed ? (
          <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Completed</span>
        ) : (
          <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
            In progress — step {survey.currentStep}/10
          </span>
        )}
      </div>

      {isVolunteer && (
        <div className="bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-coral">&#9733; Wants to volunteer on the campaign — ask them!</p>
        </div>
      )}

      {hasPriorities && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Top Priorities</p>
          <div className="flex flex-wrap gap-1.5">
            {survey.topPriorities.map((p) => (
              <span key={p} className="text-xs bg-navy/10 text-navy px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        </div>
      )}

      {hasChallenges && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Biggest Westside Challenges</p>
          <div className="flex flex-wrap gap-1.5">
            {survey.westsideChallenges.map((c) => (
              <span key={c} className="text-xs bg-coral/10 text-coral px-2 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
        </div>
      )}

      {survey.crimeApproach && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">On Crime</p>
          <p className="text-sm text-gray-700">{survey.crimeApproach}</p>
        </div>
      )}

      {survey.budgetTradeoff && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Budget Priority</p>
          <p className="text-sm text-gray-700">{survey.budgetTradeoff}</p>
        </div>
      )}

      {hasOpenText && (
        <div className="space-y-2">
          {survey.overlookedIssue && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Overlooked Issue</p>
              <p className="text-sm text-gray-700 italic">&ldquo;{survey.overlookedIssue}&rdquo;</p>
            </div>
          )}
          {survey.legislativeFocus && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Legislative Focus</p>
              <p className="text-sm text-gray-700 italic">&ldquo;{survey.legislativeFocus}&rdquo;</p>
            </div>
          )}
          {survey.closingThoughts && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">In Their Own Words</p>
              <p className="text-sm text-gray-700 italic">&ldquo;{survey.closingThoughts}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {hasEngagement && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Wants to Stay Involved</p>
          <div className="flex flex-wrap gap-1.5">
            {survey.engagementInterest.map((e) => (
              <span key={e} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{e}</span>
            ))}
          </div>
        </div>
      )}

      {survey.contactPreference && (
        <p className="text-xs text-gray-500">
          Preferred contact: <span className="font-semibold text-gray-700">{survey.contactPreference}</span>
        </p>
      )}
    </section>
  );
}

export default function BriefingDrawer({ delegate, onClose }) {
  const script = getRecommendedScript(delegate.stage, delegate.wasOrdSupporter);
  const days = delegate.lastContactedAt ? daysSince(delegate.lastContactedAt) : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer — full screen on mobile, right panel on desktop */}
      <div className="fixed inset-0 md:inset-y-0 md:left-auto md:w-[480px] bg-white z-50 overflow-y-auto shadow-xl">
        <div className="p-5 space-y-6">
          {/* Close */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-condensed font-bold text-navy text-2xl">{delegate.name}</h2>
              <p className="text-sm text-gray-500">{delegate.precinct} &middot; {delegate.role}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          {/* Header badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <StageBadge stage={delegate.stage} />
            {days !== null && (
              <span className="text-xs text-gray-500">{days} day{days !== 1 ? "s" : ""} since last contact</span>
            )}
            {delegate.isPLEO && (
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">&#9733; PLEO</span>
            )}
          </div>

          {/* Survey insights — shown before scripts so volunteers are prepared */}
          <SurveyInsights survey={delegate.survey} />

          {/* Ord supporter warning */}
          {delegate.wasOrdSupporter && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-800">&#9888;&#65039; Was a James Ord supporter &mdash; warm lead. Lead with empathy.</p>
            </div>
          )}

          {/* Section 2: Which script to use */}
          <section>
            <h3 className="font-condensed font-bold text-navy text-lg mb-2">Recommended Script</h3>
            {script.prepend && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-purple-800">{script.prepend}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1">{script.label}</p>
              <p className="text-xs text-gray-400 mb-3">{script.useWhen}</p>
              <div className="space-y-2">
                {script.lines.map((line, i) => (
                  <p key={i} className={`text-sm ${line.startsWith("[") ? "text-gray-400 italic" : "text-gray-700"}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Talking points */}
          <section>
            <h3 className="font-condensed font-bold text-navy text-lg mb-2">Key Talking Points</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><span className="shrink-0">&#9889;</span> In 2007, Aaron was the first paid employee on Barack Obama's campaign in Utah.</li>
              <li className="flex gap-2"><span className="shrink-0">&#9889;</span> The 3 contrasts: prison not school / ICE not ER / camp not housing</li>
              <li className="flex gap-2"><span className="shrink-0">&#9889;</span> Proof: Stericycle shutdown &rarr; Brockovich &rarr; Michelle Obama &rarr; PNUT Board</li>
            </ul>
          </section>

          {/* Section 4: Issues raised */}
          {delegate.issuesRaised?.length > 0 && (
            <section>
              <h3 className="font-condensed font-bold text-navy text-lg mb-2">Issues Raised</h3>
              <div className="flex flex-wrap gap-2">
                {delegate.issuesRaised.map((issue) => (
                  <span key={issue} className="bg-light-gray text-gray-700 text-xs font-medium px-3 py-1 rounded-full">
                    #{issue.toLowerCase().replace(/\s+/g, "")}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Exact words logged */}
          {delegate.exactWordsLogged?.length > 0 && (
            <section>
              <h3 className="font-condensed font-bold text-navy text-lg mb-2">What They Said</h3>
              <div className="space-y-3">
                {delegate.exactWordsLogged.map((entry, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 italic">&ldquo;{entry.text}&rdquo;</p>
                    <p className="text-xs text-gray-400 mt-1">&mdash; logged by {entry.by}, {timeAgo(entry.date)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: Notes */}
          {delegate.notes && (
            <section>
              <h3 className="font-condensed font-bold text-navy text-lg mb-2">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{delegate.notes}</p>
              </div>
            </section>
          )}

          {/* Section 7: Objection responses */}
          <section>
            <h3 className="font-condensed font-bold text-navy text-lg mb-2">Objection Responses</h3>
            <div className="space-y-3">
              {OBJECTIONS.map((obj, i) => (
                <details key={i} className="bg-gray-50 rounded-lg">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-gray-700 hover:text-navy">
                    &ldquo;{obj.question}&rdquo;
                  </summary>
                  <p className="px-4 pb-3 text-sm text-gray-600">{obj.response}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Section 7: Contact history */}
          {delegate.contactHistory?.length > 0 && (
            <section>
              <h3 className="font-condensed font-bold text-navy text-lg mb-2">Contact History</h3>
              <div className="space-y-2">
                {delegate.contactHistory.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="text-xs text-gray-400 w-20 shrink-0">{timeAgo(entry.date)}</span>
                    <span className="capitalize">{entry.method}</span>
                    <span>&middot;</span>
                    <span className="capitalize">{entry.outcome}</span>
                    <span>&middot;</span>
                    <span>{entry.loggedBy}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Text templates */}
          <section>
            <h3 className="font-condensed font-bold text-navy text-lg mb-2">Text Templates</h3>
            <div className="space-y-3">
              {Object.entries(TEXT_TEMPLATES).map(([key, template]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 capitalize mb-1">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                      <p className="text-sm text-gray-700">{template}</p>
                    </div>
                    <CopyButton text={template} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
