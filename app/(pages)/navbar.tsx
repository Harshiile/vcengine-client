"use client"

import { useEffect } from "react"
import { LogOut, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { requestHandler } from "@/lib/requestHandler"
import { useRouter } from "next/navigation"
import { User, useUser } from "@/context/user-context"
import { applyToast } from "@/lib/toast"
import logo from '@/public/tree_logo.png'
import Image from "next/image"
import { avatarUrl } from "@/lib/avatar"

export function MainNavbar() {
    const router = useRouter()
    const { user, setUser } = useUser()
    useEffect(() => {
        requestHandler({
            url: '/auth/me',
            method: "GET",
            action: ({ user }: { user: User }) => { console.log(user); setUser(user) }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center justify-between px-6">

                {/* Logo */}
                <Image
                    unoptimized
                    src={logo}
                    alt="V'DURA"
                    width={60}
                />

                {/* Profile Section */}
                <div className="flex items-center space-x-4">

                    {/* Name */}
                    <span className="font-semibold text-md text-foreground">
                        {user?.name?.charAt(0)?.toUpperCase()}
                        {user?.name?.slice(1)}
                    </span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-primary/20 transition-all duration-300"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={avatarUrl(user?.avatarUrl)} alt="Profile" />
                                    <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 animate-scale-in" align="end">
                            <div className="flex items-center space-x-3 p-3 border-b border-border">
                                <Avatar className="h-12 w-12" onClick={() => router.push('/dashboard')}>
                                    <AvatarImage src={avatarUrl(user?.avatarUrl)} alt="Profile" />
                                    <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">@{user?.username}</p>
                                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                                </div>
                            </div>
                            <DropdownMenuItem onClick={() => { router.push("/dashboard") }} className="hover:bg-accent transition-colors">
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Repositories
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="hover:bg-destructive/10 text-destructive transition-colors" onClick={() => {
                                requestHandler({
                                    url: "/auth/logout",
                                    method: "GET",
                                    action: () => {
                                        applyToast("Success", "Logged Out!!")
                                        router.push('/login')
                                    }
                                })
                            }}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
