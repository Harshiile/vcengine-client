"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Star, GitFork, Download, Sparkles, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUser } from "@/context/user-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { WorkspaceBranch } from "./workspace-shell"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { requestHandler } from "@/lib/requestHandler"

export default function WorkspaceHeader({
  workspaceId,
  workspaceName,
  setIsDrawerOpen
}: {
  workspaceId: string
  workspaceName: string,
  setIsDrawerOpen: (option: boolean) => void
}) {

  const router = useRouter()
  const [branches, setBranches] = useState<WorkspaceBranch[]>([])
  const [selectedBranch, setSelectedBranch] = useState({
    id: "",
    name: ""
  })
  const [selectedVersion, setSelectedVersion] = useState("")
  const { user } = useUser()

  const downloadVideo = () => {
    const downloadUrl = `http://localhost:1234/api/v1/videos/download/${workspaceId}/${selectedVersion}`
    window.location.href = downloadUrl;
  }

  useEffect(() => {
    requestHandler({
      url: `/workspaces/${workspaceId}/branches`,
      method: "GET",
      action: ({ branches }: any) => {
        setBranches(branches)
        setSelectedBranch({ id: branches[0].id, name: branches[0].name })
        setSelectedVersion(branches[0].versions[0].id)
      }
    })
  }, [])

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-2 border-border/80 bg-card/60 hover:bg-card/80 hover:border-primary/50"
              >
                <span className="text-sm">{selectedBranch.name}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[60]">
              <DropdownMenuLabel>Branch Selection</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {branches.map((b) => {
                return (
                  <DropdownMenuItem
                    key={b.id}
                    className={`justify-between ${b.id === selectedBranch.id ? "bg-gray-200 text-black font-medium" : ""}`}
                  >
                    <span>{b.name}</span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

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
          <Link href={`/edit/${selectedVersion}`}>
            <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-900 bg-transparent">
              Edit
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}