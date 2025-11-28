import type React from "react"
import { Suspense } from "react"
import "@/app/globals.css"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Upload | VcEngine",
  icons: {
    icon: "/tree_logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </body>
    </html>
  )
}
