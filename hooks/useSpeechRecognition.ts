"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Web Speech API types aren't in standard TS lib — use window-level declarations
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventCustom) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionResultEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    isFinal: boolean;
    0: { transcript: string };
  };
}

interface SpeechRecognitionErrorEventCustom {
  error: string;
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = "en-IN",
    continuous = false,
    interimResults = false,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SR);

    if (SR) {
      const recognition = new SR();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onresult = (event: SpeechRecognitionResultEvent) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          setTranscript(text);
          onResult?.(text);
        }
      };

      // recognition.onerror = (event: SpeechRecognitionErrorEventCustom) => {
      //   console.error("Speech recognition error:", event.error);
      //   onError?.(event.error);
      //   setIsListening(false);
      // };

      recognition.onerror = (event: SpeechRecognitionErrorEventCustom) => {
  if (event.error === "no-speech") {
    console.log("No speech detected");
  } else {
    console.error("Speech recognition error:", event.error);
    onError?.(event.error);
  }

  setIsListening(false);
};

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [lang, continuous, interimResults, onResult, onError]);

  // const startListening = useCallback(() => {
  //   if (recognitionRef.current && !isListening) {
  //     setTranscript("");
  //     recognitionRef.current.start();
  //     setIsListening(true);
  //   }
  // }, [isListening]);

//   const startListening = useCallback(() => {
//   const recognition = recognitionRef.current;

//   if (!recognition) return;

//   // Prevent double start
//   if (isListening) return;

//   try {
//     setTranscript("");
//     recognition.start();
//     setIsListening(true);
//   } catch (err) {
//     console.warn("SpeechRecognition already running");
//   }
// }, [isListening]);

    const startListening = useCallback(() => {
  const recognition = recognitionRef.current;

  if (!recognition) return;

  // Prevent starting mic while already listening
  if (isListening) return;

  try {
    setTranscript("");
    recognition.start();
    setIsListening(true);
  } catch (err) {
    console.warn("SpeechRecognition already running");
  }
}, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
}
