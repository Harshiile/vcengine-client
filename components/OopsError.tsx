"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export default function OopsError({
    title = "Oops! Something went wrong.",
    message = "We couldn't process your request.",
}: {
    title?: string
    message?: string
}) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-black text-white px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-10 shadow-xl"
            >
                <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="text-7xl mb-6 opacity-80"
                >
                    😕
                </motion.div>

                <h1 className="text-3xl font-bold mb-4 text-white">{title}</h1>

                <p className="text-zinc-400 text-lg mb-10">{message}</p>

                <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                    Go Back Home
                </Link>
            </motion.div>
        </div>
    )
}
