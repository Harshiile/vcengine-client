"use client"

import { useState, useEffect } from "react"
import { Search, ExternalLink, Play, FileIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { requestHandler } from "@/lib/requestHandler"
import { useUser } from "@/context/user-context"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface MainContentProps {
  activeTab: string
}

export function MainContent({ activeTab }: MainContentProps) {
  const { user } = useUser()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("updated")
  const [isTransitioning, setIsTransitioning] = useState(false)

  type Branch = {
    id: string,
    name: string
  }
  type Workspace = {
    id: string
    name: string
    type: string
    createdAt: string
    banner: string | null
    Branch: Branch[]
  }

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 500)
    return () => clearTimeout(timer)
  }, [activeTab])

  // Fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (user) {
        requestHandler({
          url: `/workspaces/users/${user.id}`,
          method: "GET",
          action: ({ workspaces }: { workspaces: Workspace[] }) => {
            setWorkspaces(workspaces)
          }
        })
      }
    }
    fetchWorkspaces()

  }, [user])

  const renderRepositories = () => (
    <div
      className={`space-y-6 transition-all duration-500 ${isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
    >
      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border focus:border-primary"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="created">Recently created</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workspace List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* {
          workspaces ?
            <div className="w-full py-10 text-center text-muted-foreground text-lg font-medium">
              No repositories
            </div>
            : */}
        <>
          {filteredWorkspaces.length === 0 ? (
            <div className="w-full py-10 text-center text-muted-foreground text-lg font-medium">
              No repositories found for &quot;<span className="text-primary">{searchQuery}</span>&quot;
            </div>
          ) : (
            filteredWorkspaces.map((ws, index) => (
              <Card
                onClick={() => {
                  router.push(`/workspace/${ws.id}`)
                }}
                key={(ws as Workspace).id ?? ws.name}
                className="hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.01] cursor-pointer group bg-card border-border"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="px-4">
                  <div className="flex items-center space-x-4">
                    {/* Video Thumbnail */}
                    <div className="relative flex-shrink-0">
                      <div className="w-40 h-24 rounded-lg overflow-hidden bg-secondary/50 group-hover:ring-2 ring-primary/50 transition-all duration-300">
                        <Image
                          unoptimized
                          src={`http://localhost:1234/api/v1/storage/images/banner/${ws.banner}`}
                          alt={`${ws.name} banner`}
                          width={100}
                          height={100}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FileIcon className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold text-primary group-hover:text-primary/80 transition-colors">
                            {ws.name[0].toUpperCase()}
                            {ws.name.slice(1)}
                          </h3>
                          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
                            {(ws as Workspace).type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(ws.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: false,
                              })}
                              {" | "}
                              {new Date(ws.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {((ws as Workspace).Branch || []).length > 0 && (
                            <span className="text-primary font-medium truncate max-w-[200px]">
                              {((ws as Workspace).Branch || []).map((b: Branch) => b.name).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </>
        {/* } */}
      </div>
    </div>
  )

  return <div className="flex-1 p-6 premium-scrollbar relative z-10">{renderRepositories()}</div>
}
