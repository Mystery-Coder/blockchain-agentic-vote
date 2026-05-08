"use client";

import { useState } from "react";
import { useRFID } from "@/hooks/useRFID";
import {
	CreditCard,
	Loader2,
	CheckCircle,
	AlertCircle,
	Usb,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

interface RFIDWriterProps {
	voterHash: string; // 64 char hex to write
	voterName: string; // for display
	onSuccess: () => void; // called after successful write
}

// ── Component ─────────────────────────────────────────────────

export default function RFIDWriter({
	voterHash,
	voterName,
	onSuccess,
}: RFIDWriterProps) {
	const { connect, writeTag, disconnect, status, error, isConnected } =
		useRFID();
	const [written, setWritten] = useState(false);

	// ── Handlers ─────────────────────────────────────────────

	const handleConnect = async () => {
		await connect();
	};

	const handleWrite = async () => {
		const success = await writeTag(voterHash);
		if (success) {
			setWritten(true);
			try {
				await disconnect();
			} finally {
				setTimeout(onSuccess, 1500); // brief success pause before redirect
			}
		}
	};

	const isWriting = status === "writing";

	// ── Render ────────────────────────────────────────────────

	return (
		<div className="flex flex-col items-center gap-6">
			{/* Card animation */}
			<div className="relative flex items-center justify-center w-32 h-32">
				{/* Pulse when writing */}
				{isWriting && (
					<>
						<span
							className="absolute inline-flex h-full w-full rounded-full
                             bg-purple-400 opacity-20 animate-ping"
						/>
						<span
							className="absolute inline-flex h-3/4 w-3/4 rounded-full
                             bg-purple-400 opacity-20 animate-ping
                             [animation-delay:300ms]"
						/>
					</>
				)}

				<div
					className={`
          relative z-10 flex items-center justify-center
          w-24 h-24 rounded-2xl border-2 transition-all duration-300
          ${
				written
					? "border-green-500 bg-green-500/10"
					: isWriting
					? "border-purple-500 bg-purple-500/10"
					: isConnected
					? "border-indigo-500 bg-indigo-500/10"
					: status === "error"
					? "border-red-500 bg-red-500/10"
					: "border-gray-600 bg-gray-800"
			}
        `}
				>
					<WriterIcon written={written} status={status} />
				</div>
			</div>

			{/* Status text */}
			<div className="text-center">
				<p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-1">
					{writerLabel(status, written)}
				</p>
				{isWriting && (
					<p className="text-xs text-purple-400 animate-pulse">
						Tap your card on the reader now...
					</p>
				)}
				{written && (
					<p className="text-xs text-green-400 mt-1">
						Card enrolled for {voterName}
					</p>
				)}
				{error && <p className="text-xs text-red-400 mt-1">{error}</p>}
			</div>

			{/* Hash preview */}
			<div className="w-full p-3 rounded-xl bg-white/5 border border-white/10">
				<p className="text-xs text-gray-500 mb-1">
					Voter Hash (writing to card)
				</p>
				<p className="text-xs font-mono text-indigo-300 break-all">
					{voterHash.slice(0, 16)}...{voterHash.slice(-16)}
				</p>
			</div>

			{/* Action buttons */}
			<div className="flex flex-col gap-3 w-full">
				{!isConnected ? (
					<button
						onClick={handleConnect}
						className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500
                       text-white font-semibold transition-colors duration-200
                       flex items-center justify-center gap-2"
					>
						<Usb size={16} />
						Connect RFID Reader
					</button>
				) : !written ? (
					<button
						onClick={handleWrite}
						disabled={isWriting}
						className="w-full py-3 px-6 rounded-xl
                       bg-gradient-to-r from-indigo-600 to-purple-600
                       hover:shadow-lg hover:shadow-indigo-500/20
                       disabled:opacity-50 disabled:cursor-not-allowed
                       text-white font-semibold transition-all duration-200
                       flex items-center justify-center gap-2"
					>
						{isWriting ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Writing to card...
							</>
						) : (
							<>
								<CreditCard size={16} />
								Write to Card
							</>
						)}
					</button>
				) : (
					<div
						className="w-full py-3 px-6 rounded-xl bg-green-500/10 border border-green-500/20
                          text-green-400 font-semibold text-center flex items-center justify-center gap-2"
					>
						<CheckCircle size={16} />
						Card enrolled successfully
					</div>
				)}

				{isConnected && !written && (
					<button
						onClick={disconnect}
						disabled={isWriting}
						className="w-full py-2 px-6 rounded-xl border border-white/10
                       text-gray-500 hover:text-gray-300 text-sm
                       transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Disconnect
					</button>
				)}
			</div>
		</div>
	);
}

// ── Sub-components ─────────────────────────────────────────────

function WriterIcon({ written, status }: { written: boolean; status: string }) {
	if (written) {
		return <CheckCircle className="w-10 h-10 text-green-400" />;
	}
	if (status === "error") {
		return <AlertCircle className="w-10 h-10 text-red-400" />;
	}
	if (status === "writing") {
		return <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />;
	}
	return <CreditCard className="w-10 h-10 text-gray-400" />;
}

// ── Helpers ───────────────────────────────────────────────────

function writerLabel(status: string, written: boolean): string {
	if (written) return "enrolled";
	switch (status) {
		case "disconnected":
			return "reader not connected";
		case "connected":
			return "ready to write";
		case "writing":
			return "writing to card";
		case "error":
			return "something went wrong";
		default:
			return "";
	}
}
