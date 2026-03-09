"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowRight, Activity, Users, Box, Hexagon, Hash, CheckCircle2, Clock } from "lucide-react";

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/blockchain");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500">
        Error loading blockchain data: {error}
      </div>
    );
  }

  const stateMap = ["Not Started", "Active", "Ended"];
  const getMethodColor = (method: string) => {
    if (method === "recordVotes") return "bg-green-500/20 text-green-400 border-green-500/30";
    if (method === "markVoters") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (method === "advanceElectionState") return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    return "bg-neutral-800 text-neutral-400 border-neutral-700";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-neutral-400">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-sm">Election Status</span>
            </div>
            {data.electionState !== 2 && (
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    await fetch("/api/admin/advance-election", { method: "POST" });
                    // Give it a second to mine
                    setTimeout(() => window.location.reload(), 1500);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-lg transition-colors border border-red-500/20"
              >
                End Election
              </button>
            )}
          </div>
          <div className="text-3xl font-bold flex items-center gap-2">
            {data.electionState === 1 && <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />}
            {data.electionState === 0 && <span className="w-3 h-3 rounded-full bg-yellow-500" />}
            {data.electionState === 2 && <span className="w-3 h-3 rounded-full bg-red-500" />}
            {stateMap[data.electionState]}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-neutral-400 mb-4">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-sm">Total Votes Cast</span>
          </div>
          <div className="text-4xl font-bold">
            {data.totalVotes}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-neutral-400 mb-4">
            <Hash className="w-5 h-5 text-orange-400" />
            <span className="font-semibold text-sm">Contract Address</span>
          </div>
          <div className="text-sm font-mono break-all text-neutral-300">
            {data.contractAddress}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 text-neutral-200 border-b border-neutral-800 pb-4">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold">Live Standings</h2>
          </div>
          <div className="space-y-4">
            {data.candidateVotes?.sort((a: any, b: any) => b.votes - a.votes).map((candidate: any) => {
              const maxVotes = Math.max(...data.candidateVotes.map((c:any) => c.votes)) || 1;
              const percentage = Math.round((candidate.votes / maxVotes) * 100);
              const isEmpty = candidate.votes === 0;
              
              return (
                <div key={candidate.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Candidate #{candidate.id}</span>
                    <span className="text-neutral-400">{candidate.votes} votes</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isEmpty ? 'bg-transparent' : 'bg-blue-500'}`}
                      style={{ width: isEmpty ? '0%' : `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6 flex flex-col max-h-[600px]">
          <div className="flex items-center gap-2 text-neutral-200 border-b border-neutral-800 pb-4">
            <Hexagon className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold">Transaction Chain</h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-500 ml-auto" />}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {data.transactions?.length === 0 && (
              <div className="text-center text-neutral-500 py-8">No transactions found.</div>
            )}
            
            {data.transactions?.map((tx: any, idx: number) => (
              <div key={tx.hash} className="relative pl-6 pb-6 last:pb-0">
                {/* Vertical Line connecting blocks */}
                {idx !== data.transactions.length - 1 && (
                  <div className="absolute left-2.5 top-8 bottom-0 w-px bg-neutral-700" />
                )}
                
                {/* Node Dot */}
                <div className="absolute left-[5px] top-1.5 w-3 h-3 rounded-full bg-neutral-600 border-2 border-neutral-900" />
                
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3 shadow-lg hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                      <Box className="w-4 h-4" />
                      Block {tx.blockNumber}
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getMethodColor(tx.method)}`}>
                      {tx.method}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <span className="text-neutral-500">From</span>
                    <span className="font-mono text-neutral-300 truncate">{tx.from}</span>
                    
                    <span className="text-neutral-500">Hash</span>
                    <span className="font-mono text-blue-400/80 truncate tooltip" title={tx.hash}>{tx.hash.substring(0, 16)}...</span>
                  </div>
                  
                  {tx.args && tx.args.length > 0 && (
                    <div className="mt-2 text-[10px] bg-neutral-900/50 p-2 rounded border border-neutral-800/50">
                      <pre className="text-neutral-400 whitespace-pre-wrap font-mono break-all">
                        {JSON.stringify(tx.args, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
