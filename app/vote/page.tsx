"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { submitVote } from "@/actions/vote";
import { logoutAction } from "@/actions/auth";
import {
  Vote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Blocks,
  LogOut,
  Accessibility,
  User,
  MapPin,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface Candidate {
  id: number;
  name: string;
  party: string;
  symbol: string;
  constituency: string;
  manifesto_summary: string;
}

export default function VotePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(
    null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [voteResult, setVoteResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Load candidates
  useEffect(() => {
    if (session?.user?.constituency) {
      fetch(`/api/candidates?constituency=${session.user.constituency}`)
        .then((r) => r.json())
        .then(setCandidates)
        .catch(console.error);
    }
  }, [session]);

  // Show PWD modal
  useEffect(() => {
    if (session?.user?.isPWD) {
      setShowPwdModal(true);
    }
  }, [session]);

  const handleVote = async () => {
    if (!selectedCandidate) return;

    setIsSubmitting(true);
    try {
      const result = await submitVote(selectedCandidate);
      setVoteResult(result);
      setShowConfirmation(false);
    } catch (error) {
      setVoteResult({
        success: false,
        message: "An error occurred while submitting your vote.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!session) return null;

  const selectedCandidateData = candidates.find(
    (c) => c.id === selectedCandidate
  );

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Blocks size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">BlockVote</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <User size={14} />
            <span>{session.user.voterName}</span>
            <span className="text-gray-600">·</span>
            <MapPin size={14} />
            <span>{session.user.constituency}</span>
          </div>
          <button
            onClick={async () => {
              await logoutAction();
              router.push("/");
              router.refresh();
            }}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* PWD Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-md w-full animate-in">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6">
              <Accessibility size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Agentic Accessibility Mode
            </h2>
            <p className="text-gray-400 mb-6">
              We detected your account is verified for PWD accessibility.
              Would you like to enable the AI-powered voice-guided voting
              experience?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPwdModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 transition-all"
              >
                Standard Voting
              </button>
              <button
                onClick={() => router.push("/vote/agentic")}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                Enable Voice Mode
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vote Result */}
      {voteResult && (
        <div className="relative z-10 max-w-2xl mx-auto pt-20 px-4">
          <div
            className={`glass-strong rounded-3xl p-10 text-center ${
              voteResult.success ? "" : ""
            }`}
          >
            <div
              className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                voteResult.success
                  ? "bg-emerald-500/20"
                  : "bg-red-500/20"
              }`}
            >
              {voteResult.success ? (
                <CheckCircle2 size={40} className="text-emerald-400" />
              ) : (
                <AlertCircle size={40} className="text-red-400" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {voteResult.success ? "Vote Submitted!" : "Vote Failed"}
            </h2>
            <p className="text-gray-400 mb-8">{voteResult.message}</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/"
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Ballot */}
      {!voteResult && (
        <div className="relative z-10 max-w-4xl mx-auto pt-8 px-4 pb-16">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Cast Your <span className="gradient-text">Vote</span>
            </h1>
            <p className="text-gray-400">
              Select your candidate for{" "}
              <span className="text-indigo-400">{session.user.constituency}</span>
            </p>
          </div>

          {/* Candidate Cards */}
          <div className="grid gap-4">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                onClick={() => setSelectedCandidate(candidate.id)}
                className={`w-full p-6 rounded-2xl text-left transition-all duration-200 group ${
                  selectedCandidate === candidate.id
                    ? "gradient-border bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                    : "glass hover:glass-strong hover:-translate-y-0.5"
                }`}
                aria-pressed={selectedCandidate === candidate.id}
              >
                <div className="flex items-center gap-5">
                  <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl transition-all ${
                      selectedCandidate === candidate.id
                        ? "bg-indigo-500/20 scale-110"
                        : "bg-white/5 group-hover:bg-white/10"
                    }`}
                  >
                    {candidate.symbol}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {candidate.name}
                    </h3>
                    <p className="text-sm text-indigo-400">
                      {candidate.party}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                      {candidate.manifesto_summary}
                    </p>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                      selectedCandidate === candidate.id
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-gray-600"
                    }`}
                  >
                    {selectedCandidate === candidate.id && (
                      <CheckCircle2 size={20} className="text-white" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {candidates.length === 0 && (
            <div className="text-center py-12">
              <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading candidates...</p>
            </div>
          )}

          {/* Submit Button */}
          {selectedCandidate && !showConfirmation && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setShowConfirmation(true)}
                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg hover:shadow-2xl hover:shadow-indigo-500/25 transition-all hover:scale-105 flex items-center gap-3"
              >
                <Vote size={22} />
                Cast Vote
              </button>
            </div>
          )}

          {/* Confirmation Modal */}
          {showConfirmation && selectedCandidateData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-strong rounded-3xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/20 mx-auto mb-4 flex items-center justify-center text-4xl">
                    {selectedCandidateData.symbol}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Confirm Your Vote
                  </h2>
                  <p className="text-gray-400">
                    You are voting for:
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                  <p className="text-lg font-semibold text-white">
                    {selectedCandidateData.name}
                  </p>
                  <p className="text-indigo-400">
                    {selectedCandidateData.party}
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                  <Shield size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-400/80 text-sm">
                    This action cannot be undone. Your vote will be added to the
                    anonymity pool and recorded on the blockchain.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 py-3.5 rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 transition-all"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVote}
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Confirm Vote
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
