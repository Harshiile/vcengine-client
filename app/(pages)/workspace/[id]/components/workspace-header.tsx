"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Download, ChevronDown, Plus } from "lucide-react"
import { useUser } from "@/context/user-context"
import { Dispatch, SetStateAction, useState } from "react"
import { WorkspaceBranch, WorkspaceVersion } from "./workspace-shell"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { requestHandler } from "@/lib/requestHandler"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"


export function BranchSelector({
  branches,
  activeBranch,
  activeVersion,
  workspaceId,
  setActiveBranch
}: {
  workspaceId: string
  branches: WorkspaceBranch[]
  activeBranch: WorkspaceBranch
  setActiveBranch: Dispatch<SetStateAction<WorkspaceBranch | null>>
  activeVersion: WorkspaceVersion,
}) {
  const [openDialog, setOpenDialog] = useState(false)
  const [newBranchName, setNewBranchName] = useState("")

  const handleCreate = () => {
    if (!newBranchName.trim()) return
    setNewBranchName("")
    setOpenDialog(false)

    requestHandler({
      url: "/workspaces/branches",
      method: "POST",
      body: {
        workspaceId: workspaceId,
        createdFromVersion: activeVersion.id,
        name: newBranchName
      },
      action: (({ message }: { message: string }) => {
        console.log(message);
      })
    })
  }

  return (
    <>
      {/* Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-2 border-border/80 bg-card/60 hover:bg-card/80 hover:border-primary/50"
          >
            <span className="text-sm">{activeBranch?.name}</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 z-[60]">
          <DropdownMenuLabel>Branch Selection</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Branch list */}
          {branches?.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => setActiveBranch(b)}
              className={`justify-between cursor-pointer ${b.id === activeBranch.id
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted/50"
                }`}
            >
              <span>{b.name}</span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* NEW BRANCH BUTTON */}
          <DropdownMenuItem
            onClick={() => setOpenDialog(true)}
            className="justify-between text-primary cursor-pointer hover:bg-primary/10"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Branch
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog for creating new branch */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Version</label>
              <p className="text-muted-foreground text-sm mt-1">{activeVersion?.commitMessage}</p>
            </div>

            <div>
              <label className="text-sm font-medium">Branch Name</label>
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Enter branch name"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newBranchName.trim()}>
              Create Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


export default function WorkspaceHeader({
  workspaceId,
  workspaceName,
  setIsDrawerOpen,
  activeVersion,
  branches,
  activeBranch,
  setActiveBranch,
}: {
  workspaceId: string
  workspaceName: string,
  branches: WorkspaceBranch[],
  activeVersion: WorkspaceVersion,
  activeBranch: WorkspaceBranch,
  setActiveBranch: Dispatch<SetStateAction<WorkspaceBranch | null>>
  setIsDrawerOpen: (option: boolean) => void
}) {

  const { user } = useUser()

  const downloadVideo = () => {
    const downloadUrl = `http://localhost:1234/api/v1/videos/download/${workspaceId}/${activeVersion.id}`
    window.location.href = downloadUrl;
  }

  return (
    <div className="px-6 py-4">
      <div className="mx-auto flex items-center justify-between">

        {/* Left: Workspace / Branch Name */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{user?.username}</span>
          <span className="text-gray-600">/</span>
          <span className="font-semibold text-white">{workspaceName}</span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {/* Branch Dropdown */}

          <BranchSelector
            branches={branches}
            activeBranch={activeBranch} setActiveBranch={setActiveBranch}
            activeVersion={activeVersion}
            workspaceId={workspaceId}
          />

          {/* Download Button */}
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 hover:bg-gray-900 bg-transparent"
            onClick={downloadVideo}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>

          {/* Change Workspace Button */}
          <Button
            onClick={() => setIsDrawerOpen(true)}
            variant="outline" size="sm" className="border-gray-700 hover:bg-gray-900 bg-transparent">
            Change Workspace
          </Button>

          {/* Edit Button */}
          <Link href={`/edit/${activeVersion?.id}`}>
            <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-900 bg-transparent">
              Edit
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}