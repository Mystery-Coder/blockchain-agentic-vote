"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Mic, MicOff, Volume2, VolumeX, Send, Square, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import RFIDReader from "@/components/RFIDReader";
import { useRFID } from "@/hooks/useRFID"
import { Usb } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────

interface VoiceAgentProps {
  constituency: string;
  voterHash: string;
  voterName: string;       // ← new
  pwdCategory?: string | null;
  onVoteSubmitted?: () => void;
}

type AgentPhase = "rfid" | "chat"

// ── Helper ────────────────────────────────────────────────────

function getMessageText(message: {
  parts?: Array<{ type: string; text?: string }>;
}): string {
  if (!message.parts) return "";
  return message.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("");
}

// ── Component ─────────────────────────────────────────────────

export function VoiceAgent({
  constituency,
  voterHash,
  voterName,
  pwdCategory,
  onVoteSubmitted,
}: VoiceAgentProps) {
  const [phase, setPhase]               = useState<AgentPhase>("rfid")
  const [rfidError, setRfidError]       = useState<string | null>(null)
  const [rfidVerified, setRfidVerified] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [inputText, setInputText]       = useState("")

  const messagesEndRef        = useRef<HTMLDivElement>(null)
  const prevMessagesLengthRef = useRef(0)
  const initSent              = useRef(false)
  

  const { readTag, isConnected, connect, status: rfidStatus } = useRFID()

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent/vote" }),
    []
  )

  const { messages, sendMessage, status } = useChat({ transport })
  const isLoading = status === "submitted" || status === "streaming"

  const {
    speak,
    cancel: cancelSpeech,
    isSpeaking,
  } = useSpeechSynthesis({
    lang: "en-IN",
    rate: pwdCategory === "cognitive" ? 0.8 : 0.9,
    pitch: 1.0,
  })

  const handleSpeechResult = useCallback(
    (transcript: string) => {
      if (transcript) sendMessage({ text: transcript })
    },
    [sendMessage]
  )

  const {
    isListening,
    startListening,
    stopListening,
    isSupported: speechRecognitionSupported,
  } = useSpeechRecognition({
    lang: "en-IN",
    onResult: handleSpeechResult,
  })

  // ── Speak RFID prompt on mount ────────────────────────────

  useEffect(() => {
    if (phase === "rfid" && voiceEnabled) {
      speak(
        `Welcome ${voterName}. Please connect your RFID reader and tap your voter card to verify your identity.`
      )
    }
  }, []) // only on mount

  // ── Start chat after RFID verified ───────────────────────

  useEffect(() => {
    if (phase !== "chat") return
    if (initSent.current) return
    initSent.current = true
    sendMessage({
      text: `The voter is from constituency ${constituency}. 
Welcome the voter and read the ballot candidates clearly.
Ask them to say the candidate name or number to vote.`,
    })
  }, [phase, constituency, sendMessage])

  // ── Speak new assistant messages ──────────────────────────

  useEffect(() => {
    if (!voiceEnabled || messages.length === 0) return
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return
    const text = getMessageText(lastMessage)
    if (lastMessage.role === "assistant" && text) {
      speak(text)
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages, voiceEnabled, speak])

  // ── Auto listen after speaking ────────────────────────────

  useEffect(() => {
    if (!voiceEnabled) return
    if (!isSpeaking && !isListening && phase === "chat") {
      startListening()
    }
  }, [isSpeaking])

  // ── Auto scroll ───────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])


  // Auto-trigger read when rfid phase mounts
// Port is already open from login — no connect needed
useEffect(() => {
  if (phase !== "rfid") return
  if (rfidVerified) return
  if (!isConnected) return

  const autoRead = async () => {
    const hash = await readTag()
    if (hash) handleHashRead(hash)
  }

  autoRead()
}, [phase, isConnected]) // only runs once when phase is "rfid"

  // ── RFID hash verified ────────────────────────────────────

  const handleHashRead = useCallback((hash: string) => {
    // Strip 0x prefix if present
    const clean = hash.replace(/^0x/, "")

    if (clean === voterHash) {
      setRfidVerified(true)
      setRfidError(null)
      if (voiceEnabled) {
        speak(`Identity confirmed. Welcome ${voterName}. Loading your ballot now.`)
      }
      // Small delay so voter hears confirmation before chat loads
      setTimeout(() => setPhase("chat"), 2500)
    } else {
      setRfidError("Card does not match your account. Please tap the correct card.")
      if (voiceEnabled) {
        speak("Card not recognized. Please tap your registered voter card.")
      }
    }
  }, [voterHash, voterName, voiceEnabled, speak])

  // ── Text submit ───────────────────────────────────────────

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      sendMessage({ text: inputText.trim() })
      setInputText("")
    }
  }

  const highContrast = pwdCategory === "visual"
  const largeTargets = pwdCategory === "locomotor"

  // ── Render ────────────────────────────────────────────────

  return (
    <div className={`flex flex-col h-full ${highContrast ? "high-contrast" : ""}`}>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-lg font-semibold text-white">Voting Assistant</h2>
          {/* Phase indicator */}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            phase === "rfid"
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-emerald-500/20 text-emerald-400"
          }`}>
            {phase === "rfid" ? "Identity Verification" : "Ballot"}
          </span>
        </div>
        <button
          onClick={() => {
            setVoiceEnabled(!voiceEnabled)
            if (voiceEnabled) cancelSpeech()
          }}
          className={`p-2 rounded-lg transition-all ${
            voiceEnabled
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/10 text-gray-400"
          } ${largeTargets ? "min-w-[48px] min-h-[48px]" : ""}`}
          aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
        >
          {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* ── RFID Phase ── */}
      {phase === "rfid" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">

          {/* Instruction card */}
          <div className={`w-full max-w-sm p-4 rounded-2xl border transition-all ${
            rfidVerified
              ? "bg-green-500/10 border-green-500/30"
              : rfidError
              ? "bg-red-500/10 border-red-500/30"
              : "bg-indigo-500/10 border-indigo-500/30"
          }`}>
            <div className="flex items-start gap-3">
              {rfidVerified ? (
                <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
              ) : rfidError ? (
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CreditCard size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  rfidVerified ? "text-green-400"
                  : rfidError  ? "text-red-400"
                  : "text-indigo-300"
                }`}>
                  {rfidVerified
                    ? `Identity confirmed — Welcome, ${voterName}`
                    : rfidError
                    ? rfidError
                    : `Step 1 of 2 — Tap your voter card to verify identity`}
                </p>
                {!rfidVerified && !rfidError && (
                  <p className="text-xs text-gray-500 mt-1">
                    Connect your RFID reader via USB, then tap your card.
                  </p>
                )}
                {rfidVerified && (
                  <p className="text-xs text-gray-500 mt-1">
                    Loading your ballot...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* WITH this: */}
	      
{!rfidVerified && (
  <div className="flex flex-col items-center gap-4 w-full max-w-sm">
    {!isConnected ? (
      // Not connected — show connect button
      <button
        onClick={async () => {
          await connect()
        }}
        className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500
                   text-white font-semibold transition-colors duration-200
                   flex items-center justify-center gap-2"
      >
        <Usb size={16} />
        Connect RFID Reader
      </button>
    ) : (
      // Connected — show tap prompt
      <p className="text-sm text-indigo-400 animate-pulse text-center">
        Tap your card on the reader...
      </p>
    )}
  </div>
)}

          {/* Verified animation */}
          {rfidVerified && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30
                              flex items-center justify-center animate-pulse">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <p className="text-sm text-gray-400">Preparing your ballot...</p>
            </div>
          )}

          {/* Voice hint */}
          {isSpeaking && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Volume2 size={14} className="animate-pulse" />
              <span>Speaking...</span>
              <button
                onClick={cancelSpeech}
                className="underline text-gray-500 hover:text-gray-300"
              >
                stop
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Chat Phase (existing, untouched) ── */}
      {phase === "chat" && (
        <>
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            role="log"
            aria-live="polite"
          >
            {messages.map((msg) => {
              const text = getMessageText(msg)
              if (!text) return null
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-indigo-600/80 text-white rounded-br-md"
                      : "bg-white/10 text-gray-100 rounded-bl-md backdrop-blur-sm border border-white/10"
                  } ${highContrast ? "text-lg font-medium" : ""}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl rounded-bl-md p-4 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm space-y-3 flex-shrink-0">
            {speechRecognitionSupported && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onMouseDown={() => { if (!isListening) startListening() }}
                  onMouseUp={stopListening}
                  onTouchStart={() => { if (!isListening) startListening() }}
                  onTouchEnd={stopListening}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all text-sm ${
                    isListening
                      ? "bg-red-500 text-white scale-105 shadow-lg shadow-red-500/30"
                      : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
                  } ${largeTargets ? "px-8 py-4 text-lg min-w-[200px] min-h-[48px]" : ""}`}
                  aria-label={isListening ? "Release to send" : "Hold to speak"}
                >
                  {isListening ? (
                    <><MicOff size={18} /><span>Release to Send</span></>
                  ) : (
                    <><Mic size={18} /><span>Hold to Speak</span></>
                  )}
                </button>
                {isListening && (
                  <span className="text-green-400 text-sm">🎤 Listening...</span>
                )}
                {isSpeaking && (
                  <button
                    onClick={cancelSpeech}
                    className="p-2.5 rounded-full bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all"
                    aria-label="Stop speaking"
                  >
                    <Square size={14} />
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                className={`flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  highContrast ? "text-lg" : ""
                } ${largeTargets ? "py-4 text-lg min-h-[48px]" : ""}`}
                disabled={isLoading}
                aria-label="Type your message"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className={`p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  largeTargets ? "px-6 min-w-[48px] min-h-[48px]" : ""
                }`}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}