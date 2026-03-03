import Link from "next/link";
import {
  Shield,
  Vote,
  Accessibility,
  Lock,
  ChevronRight,
  Blocks,
  Eye,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-emerald-600/5 blur-[80px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Blocks size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">
            BlockVote
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/results"
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            Results
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-all hover:shadow-lg hover:shadow-indigo-500/20"
          >
            Login to Vote
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center text-center px-4 pt-20 pb-32">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm text-indigo-300">
          <Lock size={14} />
          <span>Powered by Local Blockchain</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold max-w-4xl leading-tight mb-6">
          <span className="text-white">Your Vote.</span>{" "}
          <span className="gradient-text">Your Privacy.</span>{" "}
          <span className="text-white">Guaranteed.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
          A decentralized voting platform with cryptographic anonymity and
          AI-powered accessibility — ensuring every vote counts and every
          voter is empowered.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/auth/login"
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg hover:shadow-2xl hover:shadow-indigo-500/25 transition-all hover:scale-105"
          >
            Cast Your Vote
            <ChevronRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <Link
            href="/results"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl glass text-white font-semibold text-lg hover:bg-white/10 transition-all"
          >
            View Results
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-8 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "Cryptographic Anonymity",
              desc: "Votes are shuffled in batches before recording on-chain — no link between your identity and your choice.",
              color: "from-indigo-500 to-blue-500",
            },
            {
              icon: Accessibility,
              title: "Agentic Accessibility",
              desc: "AI-powered voice assistant guides PWD-verified voters through the entire ballot with full WCAG 2.2 AA compliance.",
              color: "from-emerald-500 to-teal-500",
            },
            {
              icon: Vote,
              title: "Blockchain Verified",
              desc: "Every vote is permanently and transparently recorded on a local blockchain — immutable and auditable.",
              color: "from-purple-500 to-pink-500",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group p-8 rounded-2xl glass hover:glass-strong transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
              >
                <feature.icon size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
            How It{" "}
            <span className="gradient-text">Works</span>
          </h2>

          <div className="space-y-8">
            {[
              {
                step: "01",
                icon: Users,
                title: "Verify Identity",
                desc: "Log in with your Aadhaar number — your identity is immediately hashed and never stored.",
              },
              {
                step: "02",
                icon: Vote,
                title: "Cast Your Vote",
                desc: "Choose your candidate from the ballot. PWD voters can use the AI voice assistant.",
              },
              {
                step: "03",
                icon: Shield,
                title: "Anonymity Batching",
                desc: "Your vote enters a shuffle pool. When enough votes accumulate, they're cryptographically shuffled.",
              },
              {
                step: "04",
                icon: Eye,
                title: "On-Chain Recording",
                desc: "Shuffled votes are recorded on the blockchain — your identity and choice are permanently separated.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-6 p-6 rounded-2xl glass hover:glass-strong transition-all group"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
                  <span className="text-2xl font-bold gradient-text">
                    {step.step}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <step.icon size={18} className="text-indigo-400" />
                    {step.title}
                  </h3>
                  <p className="text-gray-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Blocks size={16} />
            <span>BlockVote — Academic Proof of Concept</span>
          </div>
          <p className="text-gray-600 text-sm">
            Local Hardhat Network · No Real PII · No Production Deployment
          </p>
        </div>
      </footer>
    </main>
  );
}
