import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: "Signup | VcEngine",
  icons: {
    icon: "/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans `}>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </body>
    </html>
  )
}
