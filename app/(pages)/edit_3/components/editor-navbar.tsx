"use client"

import { Button } from "@/components/ui/button"

export default function EditorNavbar() {
  return (
    <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full items-center justify-between px-4">
        {/* Brand + Tabs */}
        <div className="flex items-center gap-6">
          <div className="text-sm font-semibold tracking-tight">
            <span className="text-foreground">Cinema</span>
            <span className="text-[color:var(--silver)]">Studio</span>
          </div>
          <nav className="hidden gap-1 md:flex">
            <a className="rounded-md px-3 py-1.5 text-sm font-medium bg-secondary/40 hover:bg-secondary/60" href="#">
              Editor
            </a>
            <a className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary/40" href="#">
              Versions
            </a>
            <a className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary/40" href="#">
              Export
            </a>
          </nav>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="hidden md:inline-flex">
            New Project
          </Button>
          <Button size="sm">Upload</Button>
        </div>
      </div>
    </header>
  )
}
