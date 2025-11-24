"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { VideoPlayer } from "./components/video-player"
import { Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { requestHandler } from "@/lib/requestHandler"
import { WorkspaceDrawer } from './components/workspace-drawer'
import { useUser } from "@/context/user-context"

interface Branch {
  id: string
  name: string
  versions: Version[]
}

interface Version {
  id: string
  commitMessage: string
  createdAt: string
}

export default function PlayerPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [initialVersionId, setInitialVersionId] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedVersion, setSelectedVersion] = useState("")
  const [userName, setUserName] = useState("user")
  const [noBranch, setNoBranch] = useState<boolean>(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user } = useUser()

  useEffect(() => {
    const fetchBranchesAndVersions = async () => {
      try {
        requestHandler({
          url: `/workspaces/${workspaceId}/branches`,
          method: "GET",
          action: ({ branches }: any) => {
            if (branches.length == 0) setNoBranch(true)
            else {
              setBranches(branches)
              setSelectedBranch(branches[0].id)
              setSelectedVersion(branches[0].versions[0].id)
            }
          }
        })
      } catch (error) {
        console.error("[v0] Error fetching branches:", error)
      } finally {
        setLoading(false)
      }
    }

    if (workspaceId) {
      fetchBranchesAndVersions()
    }
  }, [workspaceId])

  const currentBranch = branches.find((b) => b.id === selectedBranch)
  const currentVersions = currentBranch?.versions || []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  const downloadVideo = () => {
    const downloadUrl = `http://localhost:1234/api/v1/videos/download/${workspaceId}/${selectedVersion}`
    window.location.href = downloadUrl;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation Bar */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Workspace / Branch Name */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{userName}</span>
            <span className="text-gray-600">/</span>
            <span className="font-semibold text-white">{currentBranch?.name || "Select Branch"}</span>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Branch Dropdown */}
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-40 bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            {/* Crop Button */}
            <Link href={`/edit/${selectedVersion}`}>
              <Button variant="outline" size="sm" className="border-gray-700 hover:bg-gray-900 bg-transparent">
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {branches.length > 0 && selectedVersion ? (
            <VideoPlayer
              workspaceId={workspaceId}
              initialVersionId={selectedVersion}
              branches={branches}
              selectedBranch={selectedBranch}
              onBranchChange={(branchId) => {
                setSelectedBranch(branchId)
                const branch = branches.find((b) => b.id === branchId)
                if (branch?.versions?.[0]) {
                  setSelectedVersion(branch.versions[0].id)
                }
              }}
              onVersionChange={setSelectedVersion}
            />
          ) : (
            <div className="text-center py-12 text-gray-400">No videos available</div>
          )}
        </div>
      </div>

      <WorkspaceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userId={user?.id}
        currentWorkspaceId={workspaceId}
      />
    </div>
  )
}
