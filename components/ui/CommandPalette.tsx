'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Asset } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface CommandPaletteProps {
    assets: Asset[];
    isOpen: boolean;
    onClose: () => void;
    currentQuery?: string;
    onQueryChange?: (query: string) => void;
    onSearch?: (query: string) => void;
    onClear?: () => void;
}

export default function CommandPalette({ assets, isOpen, onClose, currentQuery, onQueryChange, onSearch, onClear }: CommandPaletteProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState(currentQuery || '');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sync with external query
    useEffect(() => {
        if (isOpen) {
            setSearchQuery(currentQuery || '');
        }
    }, [isOpen, currentQuery]);

    // Focus AND Select input when search opens (Solves "Append to previous" issue)
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select(); // Select all text so typing replaces it
        }
    }, [isOpen]);

    // Clear internal query when closed
    useEffect(() => {
        // No-op
    }, [isOpen]);

    // Filter Assets (Locally for the list, parent handles table filter via onQueryChange)
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const query = searchQuery.toLowerCase();
        return assets.filter(asset =>
            asset.symbol.toLowerCase().includes(query) ||
            asset.name.toLowerCase().includes(query)
        ).sort((a, b) => {
            const aStarts = a.symbol.toLowerCase().startsWith(query);
            const bStarts = b.symbol.toLowerCase().startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return 0;
        }).slice(0, 7);
    }, [assets, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative border-b border-border">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            if (onQueryChange) onQueryChange(val); // Real-time sync
                        }}
                        placeholder="Type to search symbol..."
                        className="h-12 pl-11 pr-12 border-none focus-visible:ring-0 rounded-none shadow-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                if (onClear) onClear(); // If user escapes via Input, clear filter?
                                // "Hitting Escape should reset the search query and display all assets again."
                                onClose();
                            }
                            if (e.key === 'Enter') {
                                if (onSearch) {
                                    onSearch(searchQuery);
                                }
                            }
                        }}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="max-h-72 overflow-y-auto custom-scrollbar p-1.5">
                    {searchResults.length > 0 ? (
                        <div className="space-y-1">
                            {searchResults.map((asset) => (
                                <Button
                                    key={asset.id}
                                    variant="ghost"
                                    onClick={() => {
                                        router.push(`/analyze/${asset.symbol}`);
                                        onClose();
                                    }}
                                    className="w-full flex items-center justify-between p-2.5 hover:bg-secondary/40 rounded-lg transition-colors group text-left h-auto justify-start"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Coin Icon */}
                                        <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:text-foreground group-hover:bg-secondary transition-colors">
                                            {asset.symbol[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-foreground">{asset.symbol}</span>
                                                <span className="text-xs text-muted-foreground">{asset.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-mono text-muted-foreground">
                                                    ${parseFloat(asset.price.toString()).toLocaleString()}
                                                </span>
                                                <span className={`font-medium ${parseFloat(asset.change24h.toString()) >= 0 ? 'text-up' : 'text-down'}`}>
                                                    {parseFloat(asset.change24h.toString()) >= 0 ? '+' : ''}{parseFloat(asset.change24h.toString()).toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        Select <span className="p-1 min-w-[1.5rem] text-center bg-background border border-border rounded text-[10px] shadow-sm">↵</span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-muted-foreground">
                            <p className="text-sm">{searchQuery ? 'No assets found' : 'Type to search...'}</p>
                        </div>
                    )}
                </div>

                <div className="px-3 py-2 bg-muted/20 border-t border-border flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Quick Select</span>
                    <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        <span className="text-xs">ESC</span> to close
                    </kbd>
                </div>
            </div>
            {/* Backdrop Click to Close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}
