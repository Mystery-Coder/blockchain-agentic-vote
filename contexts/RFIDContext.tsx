"use client"

import {
  createContext, useContext, useRef,
  useState, useCallback, useEffect, ReactNode
} from "react"

// ── Types ─────────────────────────────────────────────────────

type RFIDStatus = "disconnected" | "connected" | "reading" | "writing" | "error"

interface RFIDContextValue {
  status: RFIDStatus
  error: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  readTag: () => Promise<string | null>
  writeTag: (hexHash: string) => Promise<boolean>
}

// ── Context ───────────────────────────────────────────────────

const RFIDContext = createContext<RFIDContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────

export function RFIDProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RFIDStatus>("disconnected")
  const [error, setError]   = useState<string | null>(null)

  const portRef    = useRef<SerialPort | null>(null)
  const readerRef  = useRef<ReadableStreamDefaultReader | null>(null)
  const writerRef  = useRef<WritableStreamDefaultWriter | null>(null)
  const bufferRef  = useRef<string>("")

  // ── Cleanup on unmount ────────────────────────────────────

  useEffect(() => {
    return () => { _disconnect() }
  }, [])

  // ── Internal disconnect (no state update for reuse) ───────

  const _disconnect = async () => {
    try { readerRef.current?.cancel() }    catch {}
    try { writerRef.current?.close() }     catch {}
    try { await portRef.current?.close() } catch {}
    portRef.current   = null
    readerRef.current = null
    writerRef.current = null
    bufferRef.current = ""
  }

  // ── Connect ───────────────────────────────────────────────

  const connect = useCallback(async () => {
    // Already connected — reuse existing port
    if (portRef.current) {
      setStatus("connected")
      setError(null)
      return
    }

    try {
      setError(null)
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 115200 })

      portRef.current   = port
      readerRef.current = port.readable!.getReader()
      writerRef.current = port.writable!.getWriter()

      setStatus("connected")

      // Drain READY message
      await _readLine()

    } catch (err: any) {
      setError(err.message ?? "Failed to connect")
      setStatus("error")
    }
  }, [])

  // ── Disconnect (public) ───────────────────────────────────

  const disconnect = useCallback(async () => {
    await _disconnect()
    setStatus("disconnected")
    setError(null)
  }, [])

  // ── Low level: read one JSON line ─────────────────────────

  const _readLine = useCallback(async () => {
    const reader  = readerRef.current
    if (!reader) return null
    const decoder = new TextDecoder()

    while (true) {
      const { value, done } = await reader.read()
      if (done) return null

      bufferRef.current += decoder.decode(value, { stream: true })
      const nl = bufferRef.current.indexOf("\n")

      if (nl !== -1) {
        const line = bufferRef.current.slice(0, nl).trim()
        bufferRef.current = bufferRef.current.slice(nl + 1)
        try { return JSON.parse(line) } catch { continue }
      }
    }
  }, [])

  // ── Low level: send command ───────────────────────────────

  const _send = useCallback(async (payload: object) => {
    const writer = writerRef.current
    if (!writer) throw new Error("Not connected")
    const line = JSON.stringify(payload) + "\n"
    await writer.write(new TextEncoder().encode(line))
  }, [])

  // ── Read tag ──────────────────────────────────────────────

  const readTag = useCallback(async (): Promise<string | null> => {
    if (!portRef.current) {
      setError("Not connected to RFID reader")
      return null
    }

    setStatus("reading")
    setError(null)

    for (let i = 0; i < 25; i++) {
      try {
        await _send({ cmd: "READ" })
        const res = await _readLine()
        if (!res) continue

        if (res.status === "OK" && res.data) {
          setStatus("connected")
          return res.data
        }
        if (res.status === "ERROR") {
          setError(res.msg ?? "Read error")
          setStatus("error")
          return null
        }
        // WAITING — retry
        await delay(600)
      } catch (err: any) {
        setError(err.message ?? "Read failed")
        setStatus("error")
        return null
      }
    }

    setError("No card detected. Please tap your card.")
    setStatus("error")
    return null
  }, [_send, _readLine])

  // ── Write tag ─────────────────────────────────────────────

  const writeTag = useCallback(async (hexHash: string): Promise<boolean> => {
    if (!portRef.current) {
      setError("Not connected to RFID reader")
      return false
    }
    if (hexHash.length !== 64) {
      setError("Hash must be 64 hex characters")
      return false
    }

    setStatus("writing")
    setError(null)

    try {
      await _send({ cmd: "WRITE", data: hexHash })
      const res = await _readLine()

      if (!res) {
        setError("No response from device")
        setStatus("error")
        return false
      }
      if (res.status === "OK") {
        setStatus("connected")
        return true
      }
      setError(res.msg ?? "Write failed")
      setStatus("error")
      return false

    } catch (err: any) {
      setError(err.message ?? "Write failed")
      setStatus("error")
      return false
    }
  }, [_send, _readLine])

  // ── Value ─────────────────────────────────────────────────

  return (
    <RFIDContext.Provider value={{
      status, error,
      isConnected: status !== "disconnected" && status !== "error",
      connect, disconnect, readTag, writeTag,
    }}>
      {children}
    </RFIDContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────

export function useRFID(): RFIDContextValue {
  const ctx = useContext(RFIDContext)
  if (!ctx) throw new Error("useRFID must be used inside RFIDProvider")
  return ctx
}

// ── Util ──────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}