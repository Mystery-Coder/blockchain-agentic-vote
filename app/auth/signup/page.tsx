"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield, Fingerprint, KeyRound, Eye, EyeOff,
  AlertCircle, Blocks, ArrowLeft, Loader2,
  CreditCard, CheckCircle, User,
} from "lucide-react"
import Link from "next/link"
import RFIDWriter from "@/components/RFIDWriter"
import { signupAction, confirmEnrollmentAction } from "@/actions/auth"


// ── Types ─────────────────────────────────────────────────────

type SignupStep = "aadhaar" | "otp" | "rfid" | "done"

// ── Component ─────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter()

  const [step,         setStep]         = useState<SignupStep>("aadhaar")
  const [aadhaar,      setAadhaar]      = useState("")
  const [otp,          setOtp]          = useState("")
  const [showOtp,      setShowOtp]      = useState(false)
  const [voterHash,    setVoterHash]    = useState("")
  const [voterName,    setVoterName]    = useState("")
  const [constituency, setConstituency] = useState("")
  const [error,        setError]        = useState("")
  const [isLoading,    setIsLoading]    = useState(false)

  // ── Step 1: Aadhaar ───────────────────────────────────────

  const formatAadhaar = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 12)
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
  }

  const handleAadhaarSubmit = async () => {
  const digits = aadhaar.replace(/\s/g, "")
  if (!/^\d{12}$/.test(digits)) {
    setError("Please enter a valid 12-digit Aadhaar number.")
    return
  }

  setIsLoading(true)
  setError("")

  try {
    const res = await fetch("/api/auth/check-aadhaar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aadhaar: digits }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setIsLoading(false)
      return
    }

    // Valid — proceed to OTP
    setIsLoading(false)
    setError("")
    setStep("otp")

  } catch {
    setError("Network error. Please try again.")
    setIsLoading(false)
  }
}

  // ── Step 2: OTP → call signup API ────────────────────────

  const handleOTPSubmit = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.")
      return
    }
    setIsLoading(true)
    setError("")

    const result = await signupAction(aadhaar.replace(/\s/g, ""), otp)

    if (!result.success) {
      setError(result.error ?? "Signup failed.")
      setIsLoading(false)
      return
    }

    setVoterHash(result.voterHash!)
    setVoterName(result.name!)
    setConstituency(result.constituency!)
    setIsLoading(false)
    setStep("rfid")
  }

  // ── Step 3: RFID written → done ──────────────────────────

  const handleRFIDSuccess = async () => {
  // Card written successfully — NOW save hash to voters.json
  const result = await confirmEnrollmentAction(
    aadhaar.replace(/\s/g, ""),
    voterHash
  )
  if (!result.success) {
    setError(result.error ?? "Failed to confirm enrollment.")
    return
  }
  setStep("done")
  setTimeout(() => router.push("/auth/login"), 2000)
}

  // ── Progress indicator ────────────────────────────────────

  const steps: SignupStep[] = ["aadhaar", "otp", "rfid", "done"]
  const stepIndex = steps.indexOf(step)

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
          href="/auth/login"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          <span>Back to Login</span>
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
              <p className="text-sm text-gray-400">Voter Card Enrollment</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2 mb-8">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i <= stepIndex ? "bg-indigo-500" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* ── Step 1: Aadhaar ── */}
          {step === "aadhaar" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Enter Aadhaar Number
                </h2>
                <p className="text-gray-400 text-sm">
                  Must be registered in the electoral roll.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Aadhaar Number
                  </label>
                  <div className="relative">
                    <Fingerprint size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
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
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Verify Identity
                </h2>
                <p className="text-gray-400 text-sm">
                  Enter the OTP sent to your registered mobile.{" "}
                  <span className="text-indigo-400">(Demo: 123456)</span>
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    One-Time Password
                  </label>
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showOtp ? "text" : "password"}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tracking-[0.5em] text-center text-lg font-mono transition-all"
                      maxLength={6}
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleOTPSubmit()}
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
                    onClick={handleOTPSubmit}
                    disabled={isLoading}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading
                      ? <><Loader2 size={18} className="animate-spin" />Verifying...</>
                      : "Verify"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: RFID write ── */}
          {step === "rfid" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Enroll Your Card
                </h2>
                <p className="text-gray-400 text-sm">
                  Connect the reader and tap your blank RFID card to enroll.
                </p>
              </div>

              {/* Voter info confirmed */}
              <div className="mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20
                              flex items-center gap-3">
                <User size={16} className="text-green-400 shrink-0" />
                <div>
                  <p className="text-sm text-green-400 font-medium">{voterName}</p>
                  <p className="text-xs text-gray-500">{constituency}</p>
                </div>
              </div>

              <RFIDWriter
                voterHash={voterHash}
                voterName={voterName}
                onSuccess={handleRFIDSuccess}
              />
            </>
          )}

          {/* ── Step 4: Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20
                              flex items-center justify-center">
                <CheckCircle size={40} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Enrollment Complete</h2>
              <p className="text-gray-400 text-sm">
                Your RFID card is ready. Redirecting to login...
              </p>
              <Loader2 size={18} className="animate-spin text-indigo-400" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Security footer */}
          {step !== "done" && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-start gap-3">
                <Shield size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Your Aadhaar is hashed server-side and never stored in plain text.
                  Only the hash is written to your RFID card.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Link to login */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already enrolled?{" "}
          <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Login with RFID
          </Link>
        </p>

      </div>
    </main>
  )
}