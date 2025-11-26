"use client"

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Film, Layers, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HomePage() {
    const router = useRouter()

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-background to-muted text-foreground flex flex-col items-center overflow-hidden">

            {/* Hero Section */}
            <section className="w-full px-6 pt-28 pb-16 text-center flex flex-col items-center">
                <div className="flex items-end">
                    <Image unoptimized
                        width={100}
                        height={100}
                        src="/logo.svg"
                        alt="Logo"
                        className="w-40 h-40 drop-shadow-xl"
                    />
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
                    >
                        Powerful Cloud Video Editing Platform
                    </motion.h1>
                    <Image unoptimized
                        width={100}
                        height={100}
                        src="/logo.svg"
                        alt="Logo"
                        className="w-40 h-40 drop-shadow-xl"
                    />
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
                >
                    Edit, trim, replace, and manage video versions with seamless real-time updates.
                    Designed for creators and teams using VcEngine.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    <Button size="lg" className="h-12 px-8 text-lg font-semibold gap-2">
                        Get Started <ArrowRight className="w-5 h-5" />
                    </Button>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="w-full max-w-6xl px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 180 }}
                    className="p-6 rounded-2xl bg-card shadow-lg border border-border/40"
                >
                    <Film className="w-10 h-10 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Advanced Video Editing</h3>
                    <p className="text-muted-foreground">
                        Trim, replace, cut, merge and apply modifications with precision.
                    </p>
                </motion.div>

                <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 180 }}
                    className="p-6 rounded-2xl bg-card shadow-lg border border-border/40"
                >
                    <Layers className="w-10 h-10 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Versioning & Branching</h3>
                    <p className="text-muted-foreground">
                        Manage multiple branches, compare changes, and keep your workflow clean.
                    </p>
                </motion.div>

                <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 180 }}
                    className="p-6 rounded-2xl bg-card shadow-lg border border-border/40"
                >
                    <Sparkles className="w-10 h-10 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Automated Cloud Processing</h3>
                    <p className="text-muted-foreground">
                        Fast, secure server-side processing for all your uploaded clips.
                    </p>
                </motion.div>
            </section>

            {/* CTA Footer */}
            <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="py-20 text-center w-full bg-gradient-to-t from-muted/40 to-transparent"
            >
                <h2 className="text-3xl font-bold mb-4">Start Editing with VcEngine</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                    Create your first branch, upload video clips, and begin making changes instantly.
                </p>
                <Button
                    onClick={() => router.push("/dashboard")}
                    size="lg" className="h-12 px-8 text-lg font-semibold">
                    Open Dashboard
                </Button>
            </motion.footer>
        </div>
    );
}
