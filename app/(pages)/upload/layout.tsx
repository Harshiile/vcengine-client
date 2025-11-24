import type React from "react"
import { Suspense } from "react"
import "@/app/globals.css"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Upload | VcEngine",
  icons: {
    icon: "/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}
