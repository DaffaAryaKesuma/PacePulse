import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";

export const metadata: Metadata = {
  title: "PacePulse — AI Running Coach & Telemetry Dashboard",
  description:
    "Automated AI running coach powered by Strava, Gemini AI, and event-driven analytics. Track pace, heart rate, cadence, and get personalized training feedback.",
  keywords: ["running", "coach", "strava", "AI", "telemetry", "training"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-mono antialiased bg-[#09090B]">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
