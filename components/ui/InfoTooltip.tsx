'use client';

import { Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
    content: React.ReactNode;
    position?: 'left' | 'right'; // Which side of button to position tooltip
}

export function InfoTooltip({ content, position = 'left' }: InfoTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Calculate position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();

            let top, left;
            if (position === 'right') {
                // Position to the right of the button, vertically centered
                top = rect.top + rect.height / 2;
                left = rect.right + 8; // 8px spacing to the right
            } else {
                // Default: above button, horizontally centered
                top = rect.top - 10;
                left = rect.left + rect.width / 2;
            }

            setCoords({ top, left });
        }
    }, [isOpen, position]);

    // Close on click outside or scroll/resize
    useEffect(() => {
        if (!isOpen) return;

        const handleDismiss = (e: MouseEvent | Event) => {
            // Don't close if clicking inside tooltip
            if (
                tooltipRef.current &&
                tooltipRef.current.contains(e.target as Node)
            ) {
                return;
            }
            // Don't close if clicking the trigger button (handled by toggle)
            if (
                buttonRef.current &&
                buttonRef.current.contains(e.target as Node)
            ) {
                return;
            }
            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleDismiss);
        window.addEventListener('scroll', handleDismiss, true); // Capture phase for all scrollables
        window.addEventListener('resize', handleDismiss);

        return () => {
            document.removeEventListener('mousedown', handleDismiss);
            window.removeEventListener('scroll', handleDismiss, true);
            window.removeEventListener('resize', handleDismiss);
        };
    }, [isOpen]);

    return (
        <>
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`ml-1.5 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-muted ${isOpen ? 'text-primary bg-muted' : ''}`}
                type="button"
            >
                <Info className="w-3.5 h-3.5" />
            </button>

            {isOpen && createPortal(
                <div
                    ref={tooltipRef}
                    style={{
                        top: coords.top,
                        left: coords.left,
                    }}
                    className={`fixed w-64 p-3 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl z-[9999] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto ${position === 'right'
                            ? '-translate-y-1/2' // Vertically centered beside button
                            : '-translate-x-1/2 -translate-y-full' // Centered above button
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-xs text-zinc-300 leading-relaxed font-medium">
                        {content}
                    </div>
                    {/* Tiny arrow pointing down */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-zinc-800" />
                </div>,
                document.body
            )}
        </>
    );
}
