"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { WorkspaceVersion } from "./workspace-shell"
import { Dispatch, SetStateAction } from "react"

export default function VersionsPanel({
  versions,
  activeVersion,
  setActiveVersion
}: {
  versions: WorkspaceVersion[]
  activeVersion: WorkspaceVersion | null
  setActiveVersion: Dispatch<SetStateAction<WorkspaceVersion | null>>
}) {
  return (
    <>
      <aside className="rounded-xl border border-border/80 bg-card/40 p-3">
        <div className="text-sm font-medium mb-2">Versions</div>
        <div className="space-y-2">
          {versions?.map((v, idx) => (
            <Button
              key={v.id}
              variant={v.id === activeVersion?.id ? "default" : "outline"}
              onClick={() => {
                setActiveVersion(v)
              }}
              className={cn(
                "w-full justify-between",
                v.id === activeVersion?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/60 border-border hover:border-primary/50 hover:bg-card/80",
              )}
            >
              <span className="truncate">v{versions.length - idx - 1} - {v.commitMessage}</span>
            </Button>
          ))}
        </div>
      </aside>
    </>
  )
}
