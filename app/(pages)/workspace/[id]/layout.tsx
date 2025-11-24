import type React from "react"
import type { Metadata } from "next"
import "@/app/globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Workspace | VcEngine",
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
    <html lang="en" className="dark">
      <body className={`font-sans  antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}
