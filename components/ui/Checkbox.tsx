import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, ...props }, ref) => {
        return (
            <div className="relative flex items-center">
                <input
                    type="checkbox"
                    className={cn(
                        "peer appearance-none w-3.5 h-3.5 rounded border border-input bg-background transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        "checked:bg-primary checked:border-primary",
                        className
                    )}
                    checked={checked}
                    onChange={(e) => onCheckedChange?.(e.target.checked)}
                    ref={ref}
                    {...props}
                />
                <Check className="absolute w-3 h-3 text-primary-foreground pointer-events-none opacity-0 peer-checked:opacity-100 left-0 top-0.5" />
            </div>
        );
    }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
