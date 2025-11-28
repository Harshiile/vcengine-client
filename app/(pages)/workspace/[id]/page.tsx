"use client"

import { useEffect, useState } from "react"
import WorkspaceShell, { Workspace } from "./components/workspace-shell"
import { requestHandler } from "@/lib/requestHandler"
import { useParams } from "next/navigation"
import { MainNavbar } from "../../navbar"

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    setLoading(true)

    console.log({ workspaceId: id });

    requestHandler({
      url: `/workspaces/${id}`,
      method: "GET",
      action: ({ workspace }: { workspace: Workspace }) => {
        console.log({ workspace });
        setWorkspace(workspace)
        setLoading(false)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0C0C0C]">

      {/* ---------------- NAVBAR ---------------- */}
      <MainNavbar />

      <main className="min-h-screen">
        {loading && <WorkspaceLoadingUI />}

        {!loading && workspace && (
          <WorkspaceShell workspace={workspace} />
        )}

        {!loading && !workspace && (
          <p className="text-center text-gray-400 mt-10">No Workspace Found</p>
        )}
      </main>
    </div>
  )
}


function WorkspaceLoadingUI() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-10 h-10 border-4 border-gray-700 border-t-white rounded-full"></div>
    </div>
  )
}
