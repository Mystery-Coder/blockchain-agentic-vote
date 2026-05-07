"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VoiceAgent } from "@/components/VoiceAgent";
import {
  Blocks,
  LogOut,
  User,
  MapPin,
  Accessibility,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import Link from "next/link";

export default function AgenticVotePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (voteSubmitted) {
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-600/10 blur-[120px]" />
        </div>
        <div className="relative z-10 glass-strong rounded-3xl p-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Vote Submitted Successfully!
          </h2>
          <p className="text-gray-400 mb-8">
            Your vote has been securely submitted to the anonymity pool.
            Thank you for participating in the democratic process.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-600/8 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/vote" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Accessibility size={22} className="text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">Voice-Guided Voting</span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User size={10} />
              <span>{session.user.voterName}</span>
              <span>·</span>
              <MapPin size={10} />
              <span>{session.user.constituency}</span>
            </div>
          </div>
        </div>
        <button
          onClick={async () => {
            await logoutAction();
            // router.push("/");
            // router.refresh();
            window.location.href = "/"
          }}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </nav>

      {/* Voice Agent */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <VoiceAgent
          constituency={session.user.constituency}
          voterHash={session.user.voterHash}
          voterName={session.user.voterName}
          pwdCategory={session.user.pwdCategory}
          onVoteSubmitted={() => setVoteSubmitted(true)}
        />
      </div>
    </main>
  );
}
