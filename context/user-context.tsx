"use client"

import React, { createContext, useContext } from "react"

export type User = Record<string, any> | null
type UserContextValue = {
    user: User
    setUser: (u: User) => void
}

const Ctx = createContext<UserContextValue>({
    user: null,
    setUser: () => { },
})

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = React.useState<User>(null)
    return <Ctx.Provider value={{ user, setUser }}>{children}</Ctx.Provider>
}

export const useUser = () => useContext(Ctx)
