'use client';

import { useKeyLevels } from '@/lib/hooks/useKeyLevels';
import { useUserStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import { InfoTooltip } from './ui/InfoTooltip';

interface KeyLevelsWidgetProps {
    symbol: string;
}

export default function KeyLevelsWidget({ symbol }: KeyLevelsWidgetProps) {
    const { levels, isLoading } = useKeyLevels(symbol);
    const { settings, toggleKeyLevels } = useUserStore();

    // Minial price tracker not currently implemented in this widget
    // const [currentPrice, setCurrentPrice] = useState(0);

    // Helper to format price
    const fmt = (n: number) => {
        if (n < 1) return n.toFixed(5);
        if (n < 10) return n.toFixed(3);
        return n.toFixed(2);
    };

    // Distance calculation disabled (would need live price context)
    const dist = () => '';

    // Render a row
    const Row = ({ label, price, color }: { label: string, price: number, color: string }) => (
        <div className="flex justify-between items-center text-[10px] py-1">
            <span className={`font-bold w-6 ${color}`}>{label}</span>
            <span className="font-mono text-zinc-300">{fmt(price)}</span>
            <span className={`text-zinc-500 w-10 text-right`}>
                {dist()}
            </span>
        </div>
    );

    return (
        <div className="bg-muted/10 p-2 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center">
                    <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mr-1">Key Levels</h3>
                    <InfoTooltip content={
                        <div className="space-y-2">
                            <p><strong>Standard Pivot Points</strong> calculated from yesterday&apos;s High, Low, and Close.</p>
                            <ul className="list-disc pl-3 space-y-1 opacity-90">
                                <li><span className="text-amber-400 font-bold">P (Pivot)</span>: Main directional filter.</li>
                                <li><span className="text-rose-400 font-bold">R1 / R2</span>: Resistance (Sell).</li>
                                <li><span className="text-emerald-400 font-bold">S1 / S2</span>: Support (Buy).</li>
                            </ul>
                        </div>
                    } />
                </div>

                {/* Checkbox for Chart Application */}
                <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                    <input
                        type="checkbox"
                        className="w-3 h-3 rounded border-zinc-600 bg-transparent text-emerald-500 focus:ring-0 focus:ring-offset-0"
                        checked={settings.showKeyLevels || false}
                        onChange={toggleKeyLevels}
                    />
                    <span className="text-[10px] text-zinc-400 font-medium">Apply to chart</span>
                </label>
            </div>

            {isLoading ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                </div>
            ) : !levels ? (
                <div className="text-[10px] text-muted-foreground p-2 text-center border border-dashed border-zinc-800 rounded bg-black/20">
                    Not enough data
                </div>
            ) : (
                <div className="space-y-0.5">
                    <Row label="R2" price={levels.r2} color="text-rose-500" />
                    <Row label="R1" price={levels.r1} color="text-rose-400" />
                    <div className="my-1 border-t border-dashed border-zinc-800" />
                    <Row label="P" price={levels.p} color="text-amber-400" />
                    <div className="my-1 border-t border-dashed border-zinc-800" />
                    <Row label="S1" price={levels.s1} color="text-emerald-400" />
                    <Row label="S2" price={levels.s2} color="text-emerald-500" />
                </div>
            )}
        </div>
    );
}
