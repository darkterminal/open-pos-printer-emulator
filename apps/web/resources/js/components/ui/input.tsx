import * as React from 'react';
import { cn } from 'cn';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                'border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-primary/20 aria-invalid:border-destructive h-9 w-full min-w-0 rounded-[2px] border px-3 py-1 font-mono text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}

export { Input };
