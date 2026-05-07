"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  aadhaar: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await signIn("credentials", {
      aadhaar,
      otp,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.cause?.err?.message || "Authentication failed." };
    }
    // NextAuth redirect error is expected on success
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return { success: true };
    }
    return { success: true };
  }
}

export async function rfidLoginAction(
  rfidHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await signIn("credentials", {
      rfidHash,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: error.cause?.err?.message || "RFID authentication failed.",
      }
    }
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return { success: true }
    }
    return { success: true }
  }
}

export async function signupAction(
  aadhaar: string,
  otp: string
): Promise<{
  success: boolean
  voterHash?: string
  name?: string
  constituency?: string
  error?: string
}> {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/auth/signup`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar, otp }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      voterHash:    data.voterHash,
      name:         data.name,
      constituency: data.constituency,
    }

  } catch {
    return { success: false, error: "Network error. Please try again." }
  }
}

export async function confirmEnrollmentAction(
  aadhaar: string,
  voterHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/auth/signup/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar, voterHash }),
      }
    )
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error }
    return { success: true }
  } catch {
    return { success: false, error: "Network error." }
  }
}

export async function logoutAction() {
  await signOut({ redirect: false });
}
