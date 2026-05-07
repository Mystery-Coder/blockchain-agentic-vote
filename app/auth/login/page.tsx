"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Shield, Fingerprint, KeyRound, Eye, EyeOff,
  AlertCircle, Blocks, ArrowLeft, Loader2, CreditCard, Wifi,
} from "lucide-react";
import Link from "next/link";
import RFIDReader from "@/components/RFIDReader";
import { rfidLoginAction } from "@/actions/auth";

// ── Types ─────────────────────────────────────────────────────

type LoginTab  = "aadhaar" | "rfid"
type AadhaarStep = "aadhaar" | "otp"

// ── Component ─────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()

  // Tab
  const [activeTab, setActiveTab] = useState<LoginTab>("aadhaar")

  // Aadhaar flow state (unchanged)
  const [aadhaar,  setAadhaar]  = useState("")
  const [otp,      setOtp]      = useState("")
  const [showOtp,  setShowOtp]  = useState(false)
  const [step,     setStep]     = useState<AadhaarStep>("aadhaar")

  // Shared state
  const [error,     setError]     = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // ── Aadhaar helpers (untouched) ───────────────────────────

  const formatAadhaar = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 12)
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
  }

  const handleAadhaarSubmit = () => {
    const digits = aadhaar.replace(/\s/g, "")
    if (!/^\d{12}$/.test(digits)) {
      setError("Please enter a valid 12-digit Aadhaar number.")
      return
    }
    setError("")
    setStep("otp")
  }

  const handleLogin = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.")
      return
    }
    setIsLoading(true)
    setError("")
    try {
      const result = await signIn("credentials", {
        aadhaar: aadhaar.replace(/\s/g, ""),
        otp,
        redirect: false,
      })
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      } else {
        router.push("/vote")
        router.refresh()
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  // ── RFID handler ──────────────────────────────────────────

  const handleRFIDHash = async (hash: string) => {
    setIsLoading(true)
    setError("")
    try {
      const result = await rfidLoginAction(hash)
      if (result.success) {
        window.location.href = "/vote"
        // router.refresh()
      } else {
        setError(result.error ?? "RFID login failed.")
        setIsLoading(false)
      }
    } catch {
      setError("An unexpected error occurred.")
      setIsLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-20%] w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-8 md:p-10">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Blocks size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BlockVote</h1>
              <p className="text-sm text-gray-400">Secure Voter Login</p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-2 mb-8 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => { setActiveTab("aadhaar"); setError("") }}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-200
                ${activeTab === "aadhaar"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-gray-200"}
              `}
            >
              <Fingerprint size={15} />
              Aadhaar + OTP
            </button>
            <button
              onClick={() => { setActiveTab("rfid"); setError("") }}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-200
                ${activeTab === "rfid"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-gray-200"}
              `}
            >
              <CreditCard size={15} />
              RFID Card
            </button>
          </div>

          {/* ── Aadhaar Tab (untouched) ── */}
          {activeTab === "aadhaar" && (
            <>
              {/* Progress */}
              <div className="flex gap-2 mb-8">
                <div className="h-1 flex-1 rounded-full bg-indigo-500" />
                <div className={`h-1 flex-1 rounded-full transition-all ${
                  step === "otp" ? "bg-indigo-500" : "bg-white/10"
                }`} />
              </div>

              {step === "aadhaar" ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Enter Aadhaar Number
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Your identity is hashed immediately — never stored in plain text.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="aadhaar" className="block text-sm font-medium text-gray-300 mb-2">
                        Aadhaar Number
                      </label>
                      <div className="relative">
                        <Fingerprint size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          id="aadhaar"
                          type="text"
                          value={formatAadhaar(aadhaar)}
                          onChange={(e) => setAadhaar(e.target.value.replace(/\s/g, ""))}
                          placeholder="XXXX XXXX XXXX"
                          className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tracking-widest text-lg font-mono transition-all"
                          maxLength={14}
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleAadhaarSubmit()}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAadhaarSubmit}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Enter OTP</h2>
                    <p className="text-gray-400 text-sm">
                      Enter the OTP sent to your registered mobile.{" "}
                      <span className="text-indigo-400">(Demo: 123456)</span>
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                        One-Time Password
                      </label>
                      <div className="relative">
                        <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          id="otp"
                          type={showOtp ? "text" : "password"}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="••••••"
                          className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tracking-[0.5em] text-center text-lg font-mono transition-all"
                          maxLength={6}
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        />
                        <button
                          onClick={() => setShowOtp(!showOtp)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showOtp ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setStep("aadhaar"); setOtp(""); setError("") }}
                        className="px-6 py-3.5 rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 transition-all"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <><Loader2 size={18} className="animate-spin" />Verifying...</>
                        ) : "Verify & Login"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── RFID Tab ── */}
          {activeTab === "rfid" && (
            <>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  RFID Card Login
                </h2>
                <p className="text-gray-400 text-sm">
                  Connect the reader, then tap your registered Aadhaar card.
                </p>
              </div>

              {/* How it works hint */}
              <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20
                              flex items-start gap-2">
                <Wifi size={15} className="text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-xs text-indigo-300 leading-relaxed">
                  Uses Web Serial API — Chrome or Edge only.
                  Make sure your ESP32 is plugged in via USB.
                </p>
              </div>

              {/* Loading overlay */}
              {isLoading ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 size={32} className="animate-spin text-indigo-400" />
                  <p className="text-gray-400 text-sm">Authenticating...</p>
                </div>
              ) : (
                <RFIDReader onHashRead={handleRFIDHash} />
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <p className="text-center text-sm text-gray-500 mt-4">
  First time?{" "}
  <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors">
    Enroll your RFID card
  </Link>
</p>

          {/* Security footer */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-start gap-3">
              <Shield size={16} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500 leading-relaxed">
                Your Aadhaar number is hashed using keccak256 immediately upon
                submission. The raw number is never stored in any database,
                log, session, or blockchain state.
              </p>
            </div>
          </div>
        </div>
        

        {/* Demo info */}
        <div className="mt-6 p-4 rounded-2xl glass text-center">
          <p className="text-sm text-gray-400 mb-2">📋 Demo Aadhaar Numbers</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["111111111111", "222222222222", "333333333333"].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setAadhaar(num)
                  setActiveTab("aadhaar")
                  if (step === "otp") setStep("aadhaar")
                }}
                className="px-3 py-1 rounded-lg bg-white/5 text-gray-300 text-xs font-mono hover:bg-white/10 transition-colors"
              >
                {num.replace(/(\d{4})/g, "$1 ").trim()}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            OTP: <code className="text-indigo-400">123456</code> · PWD accounts: 2222*, 4444*, 6666*, 8888*
          </p>
        </div>
        

      </div>
    </main>
  )
}