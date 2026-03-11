"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Mic, MicOff, Volume2, VolumeX, Send, Square } from "lucide-react";
import { useRouter } from "next/navigation";



interface VoiceAgentProps {
  constituency: string;
  voterHash: string;
  pwdCategory?: string | null;
  onVoteSubmitted?: () => void;
}

// Helper to extract text content from a UIMessage
function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts) return "";
  return message.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("");
}

export function VoiceAgent({
  constituency,
  pwdCategory,
  onVoteSubmitted,
}: VoiceAgentProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const initSent = useRef(false);
  const router = useRouter();

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent/vote" }),
    []
  );

  const { messages, sendMessage, status } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Send initial message to start the conversation
  useEffect(() => {
    if (!initSent.current) {
      initSent.current = true;
      // sendMessage({
      //   text: `My constituency is ${constituency}. Please welcome me and read the ballot.`,
      // });
      sendMessage({
  text: `The voter is from constituency ${constituency}. 
  Welcome the voter and read the ballot candidates clearly.
  Ask them to say the candidate name or number to vote.`,
});
    }
  }, [constituency, sendMessage]);

  const { speak, cancel: cancelSpeech, isSpeaking } = useSpeechSynthesis({
    lang: "en-IN",
    rate: pwdCategory === "cognitive" ? 0.8 : 0.9,
    pitch: 1.0,
  });

  const handleSpeechResult = useCallback(
    (transcript: string) => {
      if (transcript) {
        sendMessage({ text: transcript });
      }
    },
    [sendMessage]
  );

  const {
    isListening,
    startListening,
    stopListening,
    isSupported: speechRecognitionSupported,
  } = useSpeechRecognition({
    lang: "en-IN",
    onResult: handleSpeechResult,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speak new assistant messages
  // useEffect(() => {
  //   if (!voiceEnabled) return;
  //   if (messages.length > prevMessagesLengthRef.current) {
  //     const lastMessage = messages[messages.length - 1];
  //     const text = getMessageText(lastMessage);
  //     if (lastMessage.role === "assistant" && text) {
  //       speak(text);

        // Check if vote was submitted
      //   if (
      //     text.includes("securely submitted") ||
      //     text.includes("Thank you for voting")
      //   ) {
      //     onVoteSubmitted?.();
      //   }
      // }
    // }
  //   prevMessagesLengthRef.current = messages.length;
  // }, [messages, voiceEnabled, speak, onVoteSubmitted]);

  useEffect(() => {
  if (!voiceEnabled || messages.length === 0) return;

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return;

  const text = getMessageText(lastMessage);

  if (lastMessage.role === "assistant" && text) {
    speak(text);

  }
  prevMessagesLengthRef.current = messages.length;

}, [messages, voiceEnabled, speak]);

  useEffect(() => {
  if (!voiceEnabled) return;

  if (!isSpeaking && !isListening) {
    startListening();
  }

}, [isSpeaking]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage({ text: inputText.trim() });
      setInputText("");
    }
  };

  const highContrast = pwdCategory === "visual";
  const largeTargets = pwdCategory === "locomotor";

  return (
    <div
      className={`flex flex-col h-full ${highContrast ? "high-contrast" : ""}`}
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-lg font-semibold text-white">
            Voting Assistant
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) cancelSpeech();
            }}
            className={`p-2 rounded-lg transition-all ${
              voiceEnabled
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-white/10 text-gray-400"
            } ${largeTargets ? "min-w-[48px] min-h-[48px]" : ""}`}
            aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
          >
            {voiceEnabled ? <Volume2 size={50} /> : <VolumeX size={50} />}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
        {messages.map((msg) => {
          const text = getMessageText(msg);
          if (!text) return null;
          return (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-indigo-600/80 text-white rounded-br-md"
                    : "bg-white/10 text-gray-100 rounded-bl-md backdrop-blur-sm border border-white/10"
                } ${highContrast ? "text-lg font-medium" : ""}`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-md p-4 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
        {/* Voice Control */}
        {speechRecognitionSupported && (
          <div className="flex justify-center mb-3">
            <button
              // onMouseDown={startListening}
              onMouseDown={() => {
  if (!isListening ) startListening();
}}
              onMouseUp={stopListening}
              // onTouchStart={startListening}
              onTouchStart={() => {
  if (!isListening ) startListening();
}}
              onTouchEnd={stopListening}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                isListening
                  ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30"
                  : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
              } ${largeTargets ? "px-8 py-4 text-lg min-w-[200px] min-h-[48px]" : ""}`}
              aria-label={isListening ? "Release to send" : "Hold to speak"}
            >
              {isListening ? (
                <>
                  <MicOff size={20} />
                  <span>Release to Send</span>
                </>
              ) : (
                <>
                  <Mic size={20} />
                  <span>Hold to Speak</span>
                </>
              )}
            </button>
            {isListening && (
  <div className="text-green-400 text-sm mt-2">
    🎤 Listening...
  </div>
)}

            {isSpeaking && (
              <button
                onClick={cancelSpeech}
                className="ml-2 p-3 rounded-full bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all"
                aria-label="Stop speaking"
              >
                <Square size={16} />
              </button>
            )}
          </div>
        )}

        {/* Text Input Fallback */}
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className={`flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
              highContrast ? "text-lg" : ""
            } ${largeTargets ? "py-4 text-lg min-h-[48px]" : ""}`}
            disabled={isLoading}
            aria-label="Type your message"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className={`p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              largeTargets ? "px-6 min-w-[48px] min-h-[48px]" : ""
            }`}
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
