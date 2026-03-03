"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Blocks,
  BarChart3,
  RefreshCw,
  Trophy,
  Users,
  Clock,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface CandidateResult {
  id: number;
  name: string;
  party: string;
  symbol: string;
  constituency: string;
  votes: number;
}

interface ResultsData {
  candidates: CandidateResult[];
  totalVotes: number;
  electionState: number;
  lastUpdated: string;
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConstituency, setSelectedConstituency] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch("/api/results");
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchResults]);

  const filteredCandidates = results?.candidates?.filter(
    (c) => selectedConstituency === "all" || c.constituency === selectedConstituency
  ) || [];

  const maxVotes = Math.max(...filteredCandidates.map((c) => c.votes), 1);
  const constituencies = [...new Set(results?.candidates?.map((c) => c.constituency) || [])];

  const electionStateText = ["Not Started", "Active", "Ended"];
  const electionStateColors = [
    "text-yellow-400 bg-yellow-500/10",
    "text-emerald-400 bg-emerald-500/10",
    "text-red-400 bg-red-500/10",
  ];

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
          <Link
            href="/"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Blocks size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">BlockVote</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-white/5 text-gray-400"
            }`}
          >
            <RefreshCw
              size={14}
              className={autoRefresh ? "animate-spin" : ""}
              style={{ animationDuration: "3s" }}
            />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <Link
            href="/auth/login"
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-all"
          >
            Vote Now
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Election <span className="gradient-text">Results</span>
          </h1>
          <p className="text-gray-400">
            Real-time vote tallies from the blockchain
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Votes",
              value: results?.totalVotes || 0,
              icon: Users,
              color: "text-indigo-400",
            },
            {
              label: "Constituencies",
              value: constituencies.length,
              icon: BarChart3,
              color: "text-purple-400",
            },
            {
              label: "Candidates",
              value: results?.candidates?.length || 0,
              icon: TrendingUp,
              color: "text-emerald-400",
            },
            {
              label: "Election State",
              value: electionStateText[results?.electionState || 0],
              icon: Clock,
              color: "text-amber-400",
              badge: true,
            },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} className={stat.color} />
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              {stat.badge ? (
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    electionStateColors[results?.electionState || 0]
                  }`}
                >
                  {stat.value}
                </span>
              ) : (
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Constituency Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setSelectedConstituency("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedConstituency === "all"
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            All Constituencies
          </button>
          {constituencies.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedConstituency(c)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedConstituency === c
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Results Cards */}
        <div className="space-y-3">
          {filteredCandidates
            .sort((a, b) => b.votes - a.votes)
            .map((candidate, index) => {
              const percentage =
                results && results.totalVotes > 0
                  ? Math.round((candidate.votes / results.totalVotes) * 100)
                  : 0;
              const barWidth =
                maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;

              return (
                <div
                  key={candidate.id}
                  className="glass rounded-2xl p-5 group hover:glass-strong transition-all"
                >
                  <div className="flex items-center gap-4 mb-3">
                    {index === 0 && candidate.votes > 0 && (
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Trophy size={16} className="text-amber-400" />
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                      {candidate.symbol}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">
                        {candidate.name}
                      </h3>
                      <p className="text-sm text-indigo-400">
                        {candidate.party}{" "}
                        <span className="text-gray-600">
                          · {candidate.constituency}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {candidate.votes}
                      </p>
                      <p className="text-sm text-gray-400">{percentage}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <RefreshCw
              size={32}
              className="animate-spin text-indigo-500 mx-auto mb-4"
            />
            <p className="text-gray-400">Loading results from blockchain...</p>
          </div>
        )}

        {!isLoading && filteredCandidates.length === 0 && (
          <div className="text-center py-12 glass rounded-2xl">
            <BarChart3 size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No votes recorded yet.</p>
            <p className="text-gray-500 text-sm mt-1">
              Results will appear here once votes are cast.
            </p>
          </div>
        )}

        {/* Last Updated */}
        {results?.lastUpdated && (
          <p className="text-center text-sm text-gray-600 mt-6">
            Last updated: {new Date(results.lastUpdated).toLocaleString()}
          </p>
        )}
      </div>
    </main>
  );
}
