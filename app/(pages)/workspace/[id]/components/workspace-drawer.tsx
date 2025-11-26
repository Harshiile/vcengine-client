"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { requestHandler } from "@/lib/requestHandler"
import Image from "next/image"

interface Workspace {
    id: string
    name: string
    banner?: string
}

interface WorkspaceDrawerProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    currentWorkspaceId: string
}

export function WorkspaceDrawer({
    isOpen,
    onClose,
    userId,
    currentWorkspaceId,
}: WorkspaceDrawerProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isOpen) return

        const fetchWorkspaces = async () => {
            requestHandler({
                url: `/workspaces/users/${userId}`,
                method: "GET",
                action: ({ workspaces }: { workspaces: Workspace[] }) => {
                    setWorkspaces(workspaces)
                    setLoading(false)
                },
            })
        }
        fetchWorkspaces()
    }, [isOpen, userId])

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className={`
                    fixed top-0 right-0 h-screen w-72 
                    bg-card/40 backdrop-blur-md border-l border-border/80 
                    z-50 transform transition-transform duration-300 ease-in-out 
                    overflow-y-auto
                    ${isOpen ? "translate-x-0" : "translate-x-full"}
                `}
            >
                {/* Header */}
                <div className="sticky top-0 bg-card/60 border-b border-border/80 p-4 flex items-center justify-between backdrop-blur-xl">
                    <h2 className="text-lg font-semibold text-foreground">Workspaces</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground hover:bg-card/80"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : workspaces.length > 0 ? (
                        <div className="space-y-4">
                            {workspaces.map((workspace) => {
                                const isActive = workspace.id === currentWorkspaceId

                                return (
                                    <Link
                                        key={workspace.id}
                                        href={`/player/${workspace.id}`}
                                        onClick={onClose}
                                        className="block group"
                                    >
                                        <div
                                            className={`rounded-xl overflow-hidden border transition-all cursor-pointer 
                        bg-card/40 backdrop-blur-sm
                        ${isActive
                                                    ? "border-primary/60 shadow-lg shadow-primary/10"
                                                    : "border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"}`}
                                        >
                                            {/* Banner */}
                                            <div className="relative w-full aspect-video bg-card/60">
                                                {workspace.banner ? (
                                                    <Image
                                                        unoptimized
                                                        width={100}
                                                        height={100}
                                                        src={`http://localhost:1234/api/v1/storage/images/banner/${workspace.banner}`}
                                                        alt={workspace.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-border/30 to-card/20">
                                                        <div className="text-center">
                                                            <div className="w-10 h-10 bg-border/30 rounded-full mx-auto mb-2" />
                                                            <span className="text-sm text-muted-foreground">
                                                                {workspace.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white font-medium">Open</span>
                                                </div>
                                            </div>

                                            {/* Workspace name */}
                                            <div className="p-3 bg-card/30 backdrop-blur-sm border-t border-border/40">
                                                <h3
                                                    className={`font-medium truncate ${isActive ? "text-primary" : "text-foreground"
                                                        }`}
                                                >
                                                    {workspace.name.toUpperCase()}
                                                </h3>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No workspaces found</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
