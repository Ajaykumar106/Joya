import type { Metadata } from "next";
import { Rajdhani, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["latin"],
  variable: '--font-rajdhani'
});

const shareTechMono = Share_Tech_Mono({
  weight: ['400'],
  subsets: ["latin"],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: "AURA-7 // CORE SYSTEM",
  description: "Advanced Cinematic AI OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${rajdhani.variable} ${shareTechMono.variable} antialiased overflow-hidden bg-[#03070d]`}>
        {children}
      </body>
    </html>
  );
}
