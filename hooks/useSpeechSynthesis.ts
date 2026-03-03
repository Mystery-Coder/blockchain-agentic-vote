"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  speak: (text: string) => void;
  cancel: () => void;
  isSupported: boolean;
}

export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const { lang = "en-IN", rate = 0.9, pitch = 1.0, onEnd } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported("speechSynthesis" in window);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [lang, rate, pitch, onEnd]
  );

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isSpeaking,
    speak,
    cancel,
    isSupported,
  };
}
