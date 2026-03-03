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

export async function logoutAction() {
  await signOut({ redirect: false });
}
