"use client"

import { useState, useEffect  } from "react"
import { useRFID } from "@/hooks/useRFID"


// ── Types ────────────────────────────────────────────────────

interface RFIDReaderProps {
  onHashRead: (hash: string) => void   // called when card is successfully read
  autoRead?: boolean                    // start reading immediately after connect
}

// ── Component ─────────────────────────────────────────────────

export default function RFIDReader({ onHashRead, autoRead = false }: RFIDReaderProps) {
  const { connect, readTag, disconnect, status, error, isConnected } = useRFID()
  const [hash, setHash] = useState<string | null>(null)

  // ── Handlers ─────────────────────────────────────────────

  const handleConnect = async () => {
    if (isConnected) {
    return
  }
    await connect()
    if (autoRead) handleRead()
  }

  const handleRead = async () => {
    setHash(null)
    
    const result = await readTag()
    if (result) {
      setHash(result)
      onHashRead(result)
    }
  }

  // ── Derived UI state ──────────────────────────────────────

  const isReading = status === "reading"

  useEffect(() => {
  if (isConnected) {
    const timer = setTimeout(() => handleRead(), 500)
    return () => clearTimeout(timer)
  }
}, [isConnected])// if port already open on mount, auto-read

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6 p-6">

      {/* Card icon + animation */}
      <div className="relative flex items-center justify-center w-32 h-32">

        {/* Pulse rings when reading */}
        {isReading && (
          <>
            <span className="absolute inline-flex h-full w-full rounded-full
                             bg-blue-400 opacity-20 animate-ping" />
            <span className="absolute inline-flex h-3/4 w-3/4 rounded-full
                             bg-blue-400 opacity-20 animate-ping
                             [animation-delay:300ms]" />
          </>
        )}

        {/* Card icon */}
        <div className={`
          relative z-10 flex items-center justify-center
          w-24 h-24 rounded-2xl border-2 transition-all duration-300
          ${status === "connected" && !isReading
            ? "border-green-500 bg-green-500/10"
            : isReading
            ? "border-blue-500 bg-blue-500/10"
            : status === "error"
            ? "border-red-500 bg-red-500/10"
            : "border-gray-600 bg-gray-800"
          }
        `}>
          <CardIcon status={status} hasHash={!!hash} />
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-1">
          {statusLabel(status, !!hash)}
        </p>
        {isReading && (
          <p className="text-xs text-blue-400 animate-pulse">
            Tap your card on the reader...
          </p>
        )}
        {hash && (
          <p className="text-xs text-green-400 font-mono mt-1">
            {hash.slice(0, 8)}...{hash.slice(-8)}
          </p>
        )}
        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500
                       text-white font-semibold transition-colors duration-200"
          >
            Connect RFID Reader
          </button>
        ) : (
          <>
            <button
              onClick={handleRead}
              disabled={isReading}
              className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold transition-colors duration-200"
            >
              {isReading ? "Waiting for card..." : "Read Card"}
            </button>

            <button
              onClick={disconnect}
              disabled={isReading}
              className="w-full py-2 px-6 rounded-xl border border-gray-600
                         hover:border-gray-400 text-gray-400 hover:text-gray-200
                         text-sm transition-colors duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disconnect
            </button>
          </>
        )}
      </div>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function CardIcon({ status, hasHash }: { status: string; hasHash: boolean }) {
  if (hasHash) {
    // Checkmark
    return (
      <svg className="w-10 h-10 text-green-400" fill="none"
           viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (status === "error") {
    // X mark
    return (
      <svg className="w-10 h-10 text-red-400" fill="none"
           viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
  // Default card icon
  return (
    <svg className="w-10 h-10 text-gray-400" fill="none"
         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="5" width="20" height="14" rx="2"
            stroke="currentColor" strokeWidth={1.5} fill="none" />
      <path strokeLinecap="round" d="M2 10h20" />
      <path strokeLinecap="round" strokeWidth={2}
            d="M6 15h4" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function statusLabel(status: string, hasHash: boolean): string {
  if (hasHash)              return "Card read successfully"
  switch (status) {
    case "disconnected":    return "Reader not connected"
    case "connected":       return "Reader connected"
    case "reading":         return "Waiting for card"
    case "writing":         return "Writing to card"
    case "error":           return "Something went wrong"
    default:                return ""
  }
}