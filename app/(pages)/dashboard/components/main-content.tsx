"use client"

import { useState, useEffect } from "react"
import { Search, Star, GitFork, Calendar, ExternalLink, Play, FileIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import axios from "axios"
import { requestHandler } from "@/lib/requestHandler"
import { useUser } from "@/context/user-context"
import { useRouter } from "next/navigation"

interface MainContentProps {
  activeTab: string
}

export function MainContent({ activeTab }: MainContentProps) {
  const { user } = useUser()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("updated")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  type Workspace = {
    id: string
    name: string
    type: string
    createdAt: string
    banner: string | null
    Branch: { id: string; name: string }[]
  }

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 500)
    return () => clearTimeout(timer)
  }, [activeTab])

  // Fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setIsLoading(true)

        user && requestHandler({
          url: `/workspaces/users/${user.id}`,
          method: "GET",
          action: ({ workspaces }: any) => {
            console.log(workspaces);

            setWorkspaces(workspaces)
          }
        })


      } catch (e) {
        setWorkspaces([])
      } finally {
        setIsLoading(false)
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
            <SelectItem value="stars">Most stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workspace List */}
      <div className="space-y-4">
        {workspaces.map((ws, index) => (
          <Card
            onClick={() => {
              router.push(`/workspace/${ws.id}`)
            }}
            key={(ws as any).id ?? ws.name}
            className="hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.01] cursor-pointer group bg-card border-border"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                {/* Video Thumbnail */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-secondary/50 group-hover:ring-2 ring-primary/50 transition-all duration-300">
                    <img
                      src={`http://localhost:1234/api/v1/storage/images/banner/${ws.banner}` || "/placeholder.svg"}
                      alt={`${ws.name} banner`}
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
                        {ws.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
                        {(ws as any).type}
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
                        <span>{new Date((ws as any).createdAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-primary">{((ws as any).Branch || []).length} branches</span>
                      {((ws as any).Branch || []).length > 0 && (
                        <span className="text-primary font-medium truncate max-w-[200px]">
                          {((ws as any).Branch || []).map((b: any) => b.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  // const renderStars = () => (
  //   <div
  //     className={`space-y-6 transition-all duration-500 ${isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
  //   >
  //     <div className="flex items-center justify-between">
  //       <h3 className="text-lg font-semibold text-foreground">Starred Video Workspaces</h3>
  //       <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
  //         {filteredStarredRepositories.length} starred
  //       </Badge>
  //     </div>

  //     <div className="space-y-4">
  //       {filteredStarredRepositories.map((repo, index) => (
  //         <Card
  //           key={repo.name}
  //           className="hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.01] cursor-pointer group bg-card border-border"
  //           style={{ animationDelay: `${index * 100}ms` }}
  //         >
  //           <CardContent className="p-4">
  //             <div className="flex items-start space-x-4">
  //               {/* Video Thumbnail */}
  //               <div className="relative flex-shrink-0">
  //                 <div className="w-24 h-16 rounded-lg overflow-hidden bg-secondary/50 group-hover:ring-2 ring-primary/50 transition-all duration-300">
  //                   <img
  //                     src={repo.banner || "/placeholder.svg"}
  //                     alt={`${repo.name} demo`}
  //                     className="w-full h-full object-cover"
  //                   />
  //                   <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
  //                     <Play className="w-4 h-4 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
  //                   </div>
  //                 </div>
  //                 <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
  //                   10min
  //                 </div>
  //               </div>

  //               {/* Video Info */}
  //               <div className="flex-1 min-w-0">
  //                 <div className="flex items-start justify-between mb-2">
  //                   <div className="flex items-center space-x-2">
  //                     <FileIcon className="w-4 h-4 text-primary" />
  //                     <h3 className="font-semibold text-primary group-hover:text-primary/80 transition-colors">
  //                       {repo.name}
  //                     </h3>
  //                     {/* <Badge
  //                       variant={repo.status === "active" ? "default" : "secondary"}
  //                       className="text-xs bg-primary/20 text-primary border-primary/30"
  //                     >
  //                       {repo.status}
  //                     </Badge> */}
  //                   </div>
  //                   <Button
  //                     variant="ghost"
  //                     size="sm"
  //                     className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
  //                   >
  //                     <Star className="w-4 h-4 fill-current text-primary" />
  //                   </Button>
  //                 </div>

  //                 {/* <p className="text-sm text-muted-foreground mb-3">{repo.description}</p> */}

  //                 {/* <div className="flex items-center justify-between text-xs text-muted-foreground">
  //                   <div className="flex items-center space-x-4">
  //                     <div className="flex items-center space-x-1">
  //                       <Clock className="w-3 h-3" />
  //                       <span>{repo.updated}</span>
  //                     </div>
  //                     <span className="flex items-center">
  //                       <Star className="w-3 h-3 mr-1" />
  //                       {repo.stars}
  //                     </span>
  //                     <span className="flex items-center">
  //                       <GitFork className="w-3 h-3 mr-1" />
  //                       {repo.forks}
  //                     </span>
  //                   </div>
  //                   <div className="flex items-center space-x-3">
  //                     <span className="text-primary">{repo.fileSize}</span>
  //                     <span className="text-primary font-medium">{repo.owner}</span>
  //                   </div>
  //                 </div> */}
  //               </div>
  //             </div>
  //           </CardContent>
  //         </Card>
  //       ))}
  //     </div>
  //   </div>
  // )

  return <div className="flex-1 p-6 premium-scrollbar relative z-10">{renderRepositories()}</div>
}
