// import "@/styles/cinemastudio-theme.css"
"use client"

import { Suspense, useEffect, useState } from "react"
import WorkspaceShell, { Workspace } from "./components/workspace-shell"
import { requestHandler } from "@/lib/requestHandler"
import { useParams } from "next/navigation"

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)

  useEffect(() => {
    requestHandler({
      url: `/workspaces/${id}`,
      method: "GET",
      action: ({ workspace }: any) => {
        setWorkspace(workspace)
      }
    })
  }, [])

  return (
    <main className="min-h-screen">
      {
        workspace ?
          <WorkspaceShell workspace={workspace} />
          :
          <p>No Workspace Found</p>
      }

    </main>
  )
}
