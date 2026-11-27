import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-[2px] border border-border bg-clip-padding font-mono text-xs font-medium uppercase tracking-[0.06em] whitespace-nowrap transition-[background-color,color,border-color] duration-150 ease-out outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default: 'border-primary/40 bg-primary text-primary-foreground hover:bg-signal-hover',
                outline: 'bg-card text-foreground hover:bg-muted',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
                ghost: 'border-transparent bg-transparent hover:bg-muted',
                destructive:
                    'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white',
                link: 'border-transparent bg-transparent text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 gap-1.5 px-3.5',
                xs: "h-6 gap-1 px-2 text-[10px] [&_svg:not([class*='size-'])]:size-3",
                sm: "h-8 gap-1 px-3 text-[11px] [&_svg:not([class*='size-'])]:size-3.5",
                lg: 'h-10 gap-2 px-5 text-xs',
                icon: 'size-9',
                'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
                'icon-sm': 'size-8',
                'icon-lg': 'size-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

function Button({
    className,
    variant = 'default',
    size = 'default',
    asChild = false,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot.Root : 'button';

    return (
        <Comp
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
