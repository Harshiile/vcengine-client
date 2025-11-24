"use client"

import { useEffect, useState } from "react"
import WorkspaceHeader from "./workspace-header"
import WorkspacePanel from "./workspace-panel"
import { requestHandler } from "@/lib/requestHandler"
import { useUser } from "@/context/user-context"
import { WorkspaceDrawer } from "./workspace-drawer"

export interface WorkspaceVersion {
  id: string
  commitMessage: string
  createdAt: string
}

export interface WorkspaceBranch {
  id: string
  name: string
  createdAt: string
  activeVersion: string | null
  Versions: WorkspaceVersion[]
}

export interface Workspace {
  id: string
  banner: string | null
  activeBranch: string
  createdAt: string
  name: string
  type: "Public" | "Private"
  Branch: WorkspaceBranch[]
}


export default function WorkspaceShell({ workspace }: { workspace: Workspace }) {

  const [activeVersion, setActiveVersion] = useState<string>()
  const [versions, setVersions] = useState<WorkspaceVersion[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user } = useUser()

  useEffect(() => {
    requestHandler({
      url: `/workspaces/${workspace.id}/versions`,
      method: "GET",
      action: ({ versions }: any) => {
        setVersions(versions);
        setActiveVersion(versions[0]) // Currently set activeVersion as first element -> Change it to real activeVersion
      }
    })
  }, [])

  return (
    <div className="px-4 md:px-8">
      <WorkspaceHeader
        workspaceId={workspace?.id}
        workspaceName={workspace?.name}
        setIsDrawerOpen={setIsDrawerOpen}
      />

      {
        activeVersion &&
        <WorkspacePanel
          workspaceId={workspace.id}
          versions={versions}
        />
      }

      <WorkspaceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userId={user?.id}
        currentWorkspaceId={workspace.id}
      />

    </div>
  )
}
