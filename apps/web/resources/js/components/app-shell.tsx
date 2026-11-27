import { Link, router, usePage } from '@inertiajs/react';
import { type PropsWithChildren, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

type AuthProps = { auth?: { user?: { name?: string; email?: string } | null } };

export function AppShell({
    children,
    className,
    title,
    description,
    actions,
    fluid = false,
    noPadding = false,
}: PropsWithChildren<{
    className?: string;
    title?: string;
    description?: string;
    actions?: ReactNode;
    fluid?: boolean;
    noPadding?: boolean;
}>) {
    const page = usePage<AuthProps>();
    const user = page.props.auth?.user;
    const url = page.url;

    const nav = [
        { href: '/jobs', label: 'Jobs' },
        { href: '/listeners', label: 'Listeners' },
        { href: '/printer-profiles', label: 'Profiles' },
    ];

    return (
        <div className="text-foreground min-h-screen">
            <header className="border-border bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
                <div
                    className={cn(
                        'mx-auto flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8',
                        fluid ? 'max-w-none' : 'max-w-[1600px]',
                    )}
                >
                    <div className="flex min-w-0 items-center gap-2.5">
                        <img
                            src="/oppe.png"
                            alt="Open POS Printer Emulator"
                            className="h-8 w-8 shrink-0 rounded-[3px] object-contain"
                        />
                        <span className="text-foreground/90 hidden truncate font-mono text-[11px] font-medium tracking-[0.14em] uppercase sm:block">
                            Open POS Printer Emulator
                        </span>
                    </div>

                    <nav className="border-border bg-card flex items-center gap-0.5 rounded-[2px] border p-0.5">
                        {nav.map((item) => {
                            const active =
                                url === item.href || url.startsWith(`${item.href}?`) || url.startsWith(`${item.href}/`);
                            return (
                                <Button
                                    key={item.href}
                                    asChild
                                    variant={active ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={cn(
                                        'h-7 border-0 px-3 text-[11px]',
                                        active && 'bg-primary/12 text-primary hover:bg-primary/16',
                                    )}
                                >
                                    <Link href={item.href}>{item.label}</Link>
                                </Button>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                        {user && (
                            <span className="text-muted-foreground hidden max-w-[220px] truncate font-mono text-[11px] md:block">
                                {user.email ?? user.name}
                            </span>
                        )}
                        {user && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => router.post('/logout')}
                            >
                                Logout
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main
                className={cn(
                    !noPadding && 'mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8',
                    !noPadding && fluid && 'max-w-none',
                    className,
                )}
            >
                {(title || description || actions) && !noPadding && (
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
                            {description && <p className="text-muted-foreground text-sm">{description}</p>}
                        </div>
                        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
