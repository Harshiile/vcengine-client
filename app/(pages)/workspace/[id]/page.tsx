"use client"

import { useEffect, useState } from "react"
import WorkspaceShell, { Workspace } from "./components/workspace-shell"
import { requestHandler } from "@/lib/requestHandler"
import { useParams } from "next/navigation"
import { MainNavbar } from "../../navbar"

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)

  useEffect(() => {
    requestHandler({
      url: `/workspaces/${id}`,
      method: "GET",
      action: ({ workspace }: { workspace: Workspace }) => {
        setWorkspace(workspace)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0C0C0C]">

      {/* ---------------- NAVBAR ---------------- */}
      <MainNavbar />

      <main className="min-h-screen">
        {
          workspace ?
            <WorkspaceShell workspace={workspace} />
            :
            <p>No Workspace Found</p>
        }

      </main>
    </div>
  )
}
