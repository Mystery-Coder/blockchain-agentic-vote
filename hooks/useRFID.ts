import { useState, useRef, useCallback, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────

type RFIDStatus =
	| "disconnected"
	| "connected"
	| "reading"
	| "writing"
	| "error";

interface RFIDResponse {
	status: "OK" | "WAITING" | "ERROR" | "READY";
	data?: string;
	msg?: string;
}

interface UseRFIDReturn {
	status: RFIDStatus;
	error: string | null;
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	readTag: () => Promise<string | null>;
	writeTag: (hexHash: string) => Promise<boolean>;
	isConnected: boolean;
}

// ── Hook ─────────────────────────────────────────────────────

export function useRFID(): UseRFIDReturn {
	const [status, setStatus] = useState<RFIDStatus>("disconnected");
	const [error, setError] = useState<string | null>(null);

	const portRef = useRef<SerialPort | null>(null);
	const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
	const writerRef = useRef<WritableStreamDefaultWriter | null>(null);
	const bufferRef = useRef<string>(""); // incomplete line buffer

	// ── Disconnect ────────────────────────────────────────────

	const disconnect = useCallback(async () => {
		try {
			const reader = readerRef.current;
			const writer = writerRef.current;
			try {
				void reader?.cancel();
			} catch {}
			try {
				reader?.releaseLock();
			} catch {}
			try {
				void writer?.abort();
			} catch {}
			try {
				writer?.releaseLock();
			} catch {}
			await withTimeout(portRef.current?.close(), 500);
		} catch (_) {}
		portRef.current = null;
		readerRef.current = null;
		writerRef.current = null;
		bufferRef.current = "";
		setStatus("disconnected");
	}, []);

	// ── Low-level: read one newline-terminated JSON line ──────

	const readLineFromSerial =
		useCallback(async (): Promise<RFIDResponse | null> => {
			const port = portRef.current;
			if (!port?.readable) return null;
			const reader = port.readable.getReader();
			readerRef.current = reader;

			const decoder = new TextDecoder();

			try {
				// Keep reading chunks until we have a complete line
				while (true) {
					const { value, done } = await reader.read();
					if (done) return null;

					bufferRef.current += decoder.decode(value, {
						stream: true,
					});
					const newlineIndex = bufferRef.current.indexOf("\n");
					if (newlineIndex !== -1) {
						const line = bufferRef.current
							.slice(0, newlineIndex)
							.trim();
						bufferRef.current = bufferRef.current.slice(
							newlineIndex + 1,
						);

						try {
							return JSON.parse(line) as RFIDResponse;
						} catch {
							// Malformed line — skip and keep reading
							continue;
						}
					}
				}
			} finally {
				try {
					reader.releaseLock();
				} catch {}
				if (readerRef.current === reader) {
					readerRef.current = null;
				}
			}
		}, []);

	// ── Connect ───────────────────────────────────────────────

	const connect = useCallback(async () => {
		try {
			setError(null);

			if (portRef.current) {
				// Avoid re-opening an active port. Treat as already connected.
				if (portRef.current.readable && portRef.current.writable) {
					setStatus("connected");
					return;
				}
				// Clean up stale refs before re-requesting.
				await disconnect();
			}

			const existingPorts = await navigator.serial.getPorts();
			const existingOpen = existingPorts.find(
				(p) => p.readable && p.writable,
			);
			if (
				existingOpen &&
				existingOpen.readable &&
				existingOpen.writable
			) {
				if (
					existingOpen.readable.locked ||
					existingOpen.writable.locked
				) {
					setError(
						"RFID reader is busy. Disconnect the other session and try again.",
					);
					setStatus("error");
					return;
				}
				portRef.current = existingOpen;
				setStatus("connected");
				await readLineFromSerial();
				return;
			}

			// Ask user to pick the serial port (ESP32)
			const port = await navigator.serial.requestPort();

			if (port.readable && port.writable) {
				if (port.readable.locked || port.writable.locked) {
					// Another reader/writer is holding the lock. Try to reset.
					try {
						await port.close();
					} catch {
						setError(
							"RFID reader is busy. Disconnect the other session and try again.",
						);
						setStatus("error");
						return;
					}
				} else {
					// Port is already open; just attach to it.
					portRef.current = port;
					setStatus("connected");
					await readLineFromSerial();
					return;
				}
			}

			try {
				await port.open({ baudRate: 115200 });
			} catch (err: any) {
				if (String(err?.message || err).includes("already open")) {
					if (port.readable && port.writable) {
						if (port.readable.locked || port.writable.locked) {
							setError(
								"RFID reader is busy. Disconnect the other session and try again.",
							);
							setStatus("error");
							return;
						}
						portRef.current = port;
						setStatus("connected");
						await readLineFromSerial();
						return;
					}
				}
				throw err;
			}

			portRef.current = port;

			setStatus("connected");

			// Drain the READY message from ESP32 on connect
			await readLineFromSerial();
		} catch (err: any) {
			setError(err.message ?? "Failed to connect");
			setStatus("error");
		}
	}, [disconnect, readLineFromSerial]);

	useEffect(() => {
		return () => {
			void disconnect();
		};
	}, [disconnect]);

	// ── Low-level: send a command to ESP32 ───────────────────

	const sendCommand = useCallback(async (payload: object) => {
		const port = portRef.current;
		if (!port?.writable) throw new Error("Not connected");

		const writer = port.writable.getWriter();
		writerRef.current = writer;

		try {
			const encoder = new TextEncoder();
			const line = JSON.stringify(payload) + "\n";
			await writer.write(encoder.encode(line));
		} finally {
			try {
				writer.releaseLock();
			} catch {}
			if (writerRef.current === writer) {
				writerRef.current = null;
			}
		}
	}, []);

	// ── Read tag (polls until card found or timeout) ──────────

	const readTag = useCallback(async (): Promise<string | null> => {
		if (!portRef.current) {
			setError("Not connected to RFID reader");
			return null;
		}

		setStatus("reading");
		setError(null);

		// Poll every 600ms for up to 15 seconds
		const maxAttempts = 25;

		for (let i = 0; i < maxAttempts; i++) {
			try {
				await sendCommand({ cmd: "READ" });
				const response = await readLineFromSerial();

				if (!response) continue;

				if (response.status === "OK" && response.data) {
					setStatus("connected");
					return response.data; // 64 char hex hash
				}

				if (response.status === "ERROR") {
					setError(response.msg ?? "Read error");
					setStatus("error");
					return null;
				}

				// WAITING — no card yet, wait and retry
				await delay(600);
			} catch (err: any) {
				setError(err.message ?? "Read failed");
				setStatus("error");
				return null;
			}
		}

		// Timed out
		setError("No card detected. Please tap your card.");
		setStatus("error");
		return null;
	}, [sendCommand, readLineFromSerial]);

	// ── Write tag ─────────────────────────────────────────────

	const writeTag = useCallback(
		async (hexHash: string): Promise<boolean> => {
			if (!portRef.current) {
				setError("Not connected to RFID reader");
				return false;
			}

			if (hexHash.length !== 64) {
				setError("Hash must be 64 hex characters");
				return false;
			}

			setStatus("writing");
			setError(null);

			try {
				await sendCommand({ cmd: "WRITE", data: hexHash });
				const response = await readLineFromSerial();

				if (!response) {
					setError("No response from device");
					setStatus("error");
					return false;
				}

				if (response.status === "OK") {
					setStatus("connected");
					return true;
				}

				setError(response.msg ?? "Write failed");
				setStatus("error");
				return false;
			} catch (err: any) {
				setError(err.message ?? "Write failed");
				setStatus("error");
				return false;
			}
		},
		[sendCommand, readLineFromSerial],
	);

	// ── Return ────────────────────────────────────────────────

	return {
		status,
		error,
		connect,
		disconnect,
		readTag,
		writeTag,
		isConnected: status !== "disconnected" && status !== "error",
	};
}

// ── Util ──────────────────────────────────────────────────────

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T> | undefined, ms: number) {
	if (!promise) return;
	return Promise.race([promise, delay(ms).then(() => undefined)]);
}
