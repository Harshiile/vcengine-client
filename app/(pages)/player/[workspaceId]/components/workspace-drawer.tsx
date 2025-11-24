"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { requestHandler } from "@/lib/requestHandler"

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

export function WorkspaceDrawer({ isOpen, onClose, userId, currentWorkspaceId }: WorkspaceDrawerProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        const fetchWorkspaces = async () => {
            requestHandler({
                url: `/workspaces/users/${userId}`,
                method: "GET",
                action: ({ workspaces }: any) => {
                    setWorkspaces(workspaces)
                    setLoading(false)
                }
            })
        }
        fetchWorkspaces()
    }, [isOpen, userId])

    return (
        <>
            {/* Overlay */}
            {isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-screen w-96 bg-gray-900 border-l border-gray-800 z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Workspaces</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : workspaces.length > 0 ? (
                        <div className="space-y-3">
                            {workspaces.map((workspace) => (
                                <Link key={workspace.id} href={`/player/${workspace.id}`} onClick={onClose} className="block group">
                                    <div
                                        className={`rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${workspace.id === currentWorkspaceId ? "border-blue-500" : "border-gray-700 hover:border-gray-600"
                                            }`}
                                    >
                                        {/* Workspace Banner */}
                                        <div className="relative w-full aspect-video bg-gray-800">
                                            {workspace.banner ? (
                                                <img
                                                    src={`http://localhost:1234/api/v1/storage/images/banner/${workspace.banner}`}
                                                    alt={workspace.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                                    <div className="text-center">
                                                        <div className="w-12 h-12 bg-gray-600 rounded-full mx-auto mb-2" />
                                                        <span className="text-sm text-gray-400">{workspace.name}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white font-medium">Open</span>
                                            </div>
                                        </div>

                                        {/* Workspace name */}
                                        <div className="p-3 bg-gray-800">
                                            <h3
                                                className={`font-medium truncate ${workspace.id === currentWorkspaceId ? "text-blue-400" : "text-gray-200"
                                                    }`}
                                            >
                                                {workspace.name}
                                            </h3>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p>No workspaces found</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
