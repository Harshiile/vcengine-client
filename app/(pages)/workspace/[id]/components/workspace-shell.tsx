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

  const [versions, setVersions] = useState<WorkspaceVersion[]>([])
  const [activeVersion, setActiveVersion] = useState<WorkspaceVersion | null>(null)

  const [branches, setBranches] = useState<WorkspaceBranch[]>([])
  const [activeBranch, setActiveBranch] = useState<WorkspaceBranch | null>(null)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user } = useUser()

  useEffect(() => {

    // Fetch Branches
    requestHandler({
      url: `/workspaces/${workspace.id}/branches`,
      method: "GET",
      action: ({ branches }: { branches: WorkspaceBranch[] }) => {
        console.log(branches);

        setBranches(branches);
        setActiveBranch(branches[0])
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    requestHandler({
      url: `/workspaces/${activeBranch?.id}/versions`,
      method: "GET",
      action: ({ versions }: { versions: WorkspaceVersion[] }) => {
        console.log(versions);
        setVersions(versions);
        if (versions.length > 0) setActiveVersion(versions[0]) // Currently set activeVersion as first element -> Change it to real activeVersion
      }
    })
  }, [activeBranch])

  return (
    <div className="px-4 md:px-8">
      <WorkspaceHeader
        branches={branches}
        workspaceId={workspace?.id}
        workspaceName={workspace?.name}
        setIsDrawerOpen={setIsDrawerOpen}
        activeVersion={activeVersion!}
        activeBranch={activeBranch!}
        setActiveBranch={setActiveBranch}
      />

      {
        activeVersion &&
        <WorkspacePanel
          versions={versions}
          activeVersion={activeVersion} setActiveVersion={setActiveVersion}
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
