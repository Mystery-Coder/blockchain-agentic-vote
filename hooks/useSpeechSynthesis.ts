"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechSynthesisOptions {
	lang?: string;
	rate?: number;
	pitch?: number;
	voiceName?: string;
	voiceURI?: string;
	voiceNameIncludes?: string;
	onEnd?: () => void;
}

interface UseSpeechSynthesisReturn {
	isSpeaking: boolean;
	speak: (text: string) => void;
	cancel: () => void;
	isSupported: boolean;
}

export function useSpeechSynthesis(
	options: UseSpeechSynthesisOptions = {},
): UseSpeechSynthesisReturn {
	const {
		lang = "en-IN",
		rate = 0.9,
		pitch = 1.0,
		voiceName,
		voiceURI,
		voiceNameIncludes,
		onEnd,
	} = options;

	const [isSpeaking, setIsSpeaking] = useState(false);
	const [isSupported, setIsSupported] = useState(false);
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
	const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

	useEffect(() => {
		const supported = "speechSynthesis" in window;
		setIsSupported(supported);
		if (!supported) return;

		const loadVoices = () => {
			voicesRef.current = window.speechSynthesis.getVoices();
		};

		loadVoices();
		window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
		return () => {
			window.speechSynthesis.removeEventListener(
				"voiceschanged",
				loadVoices,
			);
		};
	}, []);

	const speak = useCallback(
		(text: string) => {
			if (!("speechSynthesis" in window)) return;

			// Cancel any ongoing speech
			window.speechSynthesis.cancel();

			const voices =
				voicesRef.current.length > 0
					? voicesRef.current
					: window.speechSynthesis.getVoices();

			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = lang;
			utterance.rate = rate;
			utterance.pitch = pitch;

			const pickedVoice =
				(voiceURI &&
					voices.find((voice) => voice.voiceURI === voiceURI)) ||
				(voiceName &&
					voices.find((voice) => voice.name === voiceName)) ||
				(voiceNameIncludes &&
					voices.find(
						(voice) =>
							voice.lang.startsWith(lang) &&
							voice.name.includes(voiceNameIncludes),
					)) ||
				voices.find((voice) => voice.lang.startsWith(lang));

			if (pickedVoice) {
				console.log(pickedVoice);
				utterance.voice = pickedVoice;
			}

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
		[lang, rate, pitch, voiceName, voiceURI, voiceNameIncludes, onEnd],
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
