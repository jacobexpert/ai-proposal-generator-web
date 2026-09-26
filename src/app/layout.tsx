import "@fontsource-variable/inter";
import "@fontsource/calistoga";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "AI Proposal Generator",
    template: "%s · AI Proposal Generator",
  },
  description: "Evidence-backed IT proposals from RFPs, requirements and approved company knowledge.",
};

/*
 * Fonts follow the design system (Inter, Calistoga, JetBrains Mono), self-hosted via @fontsource:
 * no Google Fonts request at build or run time. Do not add next/font/google presets here.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
