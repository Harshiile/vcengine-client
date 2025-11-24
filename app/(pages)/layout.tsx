import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import "@/app/globals.css"
import { UserProvider } from "@/context/user-context"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "VcEngine",
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
        <Suspense fallback={null}>
          <UserProvider>
            {children}
            <Toaster />
          </UserProvider>
        </Suspense>
      </body>
    </html>
  )
}
