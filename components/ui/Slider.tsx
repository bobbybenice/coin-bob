import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    min: number;
    max: number;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, ...props }, ref) => {
        return (
            <input
                type="range"
                className={cn(
                    'w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Slider.displayName = 'Slider';

export { Slider };
