"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { RFIDProvider } from "@/contexts/RFIDContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <RFIDProvider>
        {children}
      </RFIDProvider>
    </SessionProvider>
  );
}