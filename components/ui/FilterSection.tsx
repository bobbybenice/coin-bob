'use client';

import { LucideIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './Button';

import { Checkbox } from './Checkbox';

export interface FilterItem {
    label: string;
    sub: string;
    key: string;
    color: string;
}

interface FilterSectionProps {
    id: string;
    title: string;
    icon: LucideIcon;
    colorClass: string;
    isOpen: boolean;
    onToggle: (id: string) => void;
    children: React.ReactNode;
    selectedCount?: number; // Added this prop based on the new button content
}

export function FilterSection({
    id,
    title,
    icon: Icon,
    colorClass,
    isOpen,
    onToggle,
    children,
    selectedCount = 0 // Default value for the new prop
}: FilterSectionProps) {
    return (
        <div className="space-y-0.5">
            <Button
                variant="ghost"
                className="flex items-center justify-start w-full p-2 bg-black/20 hover:bg-white/20 transition-colors rounded-lg group cursor-pointer h-auto"
                onClick={() => onToggle(id)}
            >
                <div className="flex items-center gap-2.5">
                    {/* Using the passed Icon prop, not hardcoding Filter */}
                    <Icon className={`w-4 h-4 ${colorClass}`} />
                    <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">
                        {title}
                    </span>
                    {selectedCount > 0 && (
                        <span className="flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-emerald-500/20 text-emerald-500 rounded-full">
                            {selectedCount}
                        </span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
            </Button>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="pl-2 pr-1 pt-0.5 space-y-0.5">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const FilterCheckbox = ({
    item,
    checked,
    onChange
}: {
    item: FilterItem;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) => (
    <label className="flex items-center gap-3 group cursor-pointer py-1 px-2 rounded hover:bg-muted/50 transition-all select-none">
        <Checkbox
            checked={checked}
            onCheckedChange={onChange}
        />
        <div className="flex flex-col">
            <span className="text-foreground font-medium text-xs">{item.label}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{item.sub}</span>
        </div>
    </label>
);
