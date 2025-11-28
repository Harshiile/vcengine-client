import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: "Signup | VcEngine",
  icons: {
    icon: "/tree_logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </body>
    </html>
  )
}
