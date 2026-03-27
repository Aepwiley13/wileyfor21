/**
 * DelegateSurveyDirectPage
 *
 * Handles the unique-link survey flow:
 *   /delegate/survey?delegate={delegateId}
 *
 * No authentication required. The delegateId in the URL scopes all
 * Firestore writes to the existing volunteer-managed delegate record.
 *
 * On first load: writes survey.linkOpenedAt once (tracks link engagement).
 * Pre-fills the delegate's name from their Hub record so they skip re-entering it.
 * Restores progress automatically if they've been here before.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import HD21Survey from "@/components/survey/HD21Survey";
import { useDelegateSurvey, EMPTY_SURVEY } from "@/hooks/useDelegateSurvey";
import { db, useMock } from "@/lib/firebase";

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <p className="text-navy font-condensed text-xl">Loading your survey…</p>
    </div>
  );
}

function InvalidLinkScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-sm text-center">
        <h1 className="font-condensed font-black text-navy text-3xl mb-3">
          Invalid Link
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          This survey link is missing a delegate ID. Please use the link sent to you
          by the campaign, or contact the Wiley for 21 team.
        </p>
        <a
          href="https://wileyfor21.com"
          className="text-coral font-semibold text-sm hover:underline"
        >
          wileyfor21.com
        </a>
      </div>
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-sm text-center">
        <h1 className="font-condensed font-black text-navy text-3xl mb-3">
          Link Not Found
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          We couldn't find the delegate record for this link. It may have expired
          or been entered incorrectly. Contact the campaign team for a new link.
        </p>
        <a
          href="https://wileyfor21.com"
          className="text-coral font-semibold text-sm hover:underline"
        >
          wileyfor21.com
        </a>
      </div>
    </div>
  );
}

export default function DelegateSurveyDirectPage() {
  const [searchParams] = useSearchParams();
  const delegateId = searchParams.get("delegate");

  const { survey, save, complete, loading } = useDelegateSurvey(delegateId);
  const [delegateName, setDelegateName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    if (!delegateId) {
      setMetaLoading(false);
      return;
    }
    if (useMock) {
      setDelegateName("Demo Delegate");
      setMetaLoading(false);
      return;
    }
    (async () => {
      const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const ref = doc(db, "delegates", delegateId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setNotFound(true);
        setMetaLoading(false);
        return;
      }

      const data = snap.data();
      setDelegateName(data.name || "");

      // Write linkOpenedAt once — tracks link engagement for Volunteer Hub
      if (!data.survey?.linkOpenedAt) {
        await setDoc(ref, { survey: { linkOpenedAt: serverTimestamp() } }, { merge: true });
      }

      setMetaLoading(false);
    })();
  }, [delegateId]);

  if (!delegateId) return <InvalidLinkScreen />;
  if (notFound) return <NotFoundScreen />;
  if (loading || metaLoading) return <LoadingScreen />;

  // Pre-fill name from Hub record if delegate hasn't typed one yet
  const initialState = {
    ...survey,
    name: survey.name || delegateName,
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <div className="bg-navy-darker px-4 py-2.5 flex items-center justify-between border-b border-navy-dark/60">
        <h1 className="font-condensed font-black text-white text-xl tracking-wide">
          WILEY FOR 21 — Delegate Survey
        </h1>
        <a
          href="https://wileyfor21.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-coral text-sm font-semibold hover:text-white transition-colors hidden sm:inline"
        >
          wileyfor21.com
        </a>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8">
        <HD21Survey
          initialState={initialState}
          onSave={save}
          onComplete={complete}
        />
      </div>
    </div>
  );
}
