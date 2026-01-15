"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { setTheme, theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="inline-flex items-center justify-center rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-zinc-800 dark:focus:ring-offset-zinc-900 opacity-50 cursor-wait">
                <Sun className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            </button>
        )
    }

    const currentTheme = theme === 'system' ? resolvedTheme : theme;
    const isDark = currentTheme === 'dark';

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-zinc-800 dark:focus:ring-offset-zinc-900"
            aria-label="Toggle theme"
        >
            {isDark ? (
                <Moon className="h-5 w-5 transition-all text-zinc-900 dark:text-zinc-100" />
            ) : (
                <Sun className="h-5 w-5 transition-all text-amber-500" />
            )}
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
