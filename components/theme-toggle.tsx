"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "./ui/Button"

export function ThemeToggle() {
    const { setTheme, theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="opacity-50 cursor-wait">
                <Sun className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            </Button>
        )
    }

    const currentTheme = theme === 'system' ? resolvedTheme : theme;
    const isDark = currentTheme === 'dark';

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="rounded-md"
            aria-label="Toggle theme"
        >
            {isDark ? (
                <Moon className="h-5 w-5 transition-all text-zinc-900 dark:text-zinc-100" />
            ) : (
                <Sun className="h-5 w-5 transition-all text-amber-500" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
