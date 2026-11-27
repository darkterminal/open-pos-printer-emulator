import { Link, router, usePage } from '@inertiajs/react';
import { type PropsWithChildren, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
}: PropsWithChildren<{ className?: string; title?: string; description?: string; actions?: ReactNode; fluid?: boolean; noPadding?: boolean }>) {
  const page = usePage<AuthProps>();
  const user = page.props.auth?.user;
  const url = page.url;

  const nav = [
    { href: '/jobs', label: 'Jobs' },
    { href: '/listeners', label: 'Listeners' },
    { href: '/printer-profiles', label: 'Profiles' },
  ];

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl">
        <div className={cn('mx-auto flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8', fluid ? 'max-w-none' : 'max-w-[1600px]')}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-primary/15 text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>
            </div>
            <span className="hidden truncate text-sm font-semibold tracking-tight sm:block">Open POS Printer Emulator</span>
          </div>

          <nav className="flex items-center gap-1 rounded-lg border bg-card/40 p-0.5">
            {nav.map((item) => {
              const active = url === item.href || url.startsWith(`${item.href}?`) || url.startsWith(`${item.href}/`);
              return (
                <Button key={item.href} asChild variant={active ? 'secondary' : 'ghost'} size="sm" className={cn('h-7 px-2.5 text-xs', active && 'bg-primary/15 text-foreground hover:bg-primary/20')}>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user && <span className="hidden max-w-[200px] truncate text-xs text-muted-foreground md:block">{user.email ?? user.name}</span>}
            {user && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => router.post('/logout')}>Logout</Button>}
          </div>
        </div>
      </header>

      <main className={cn(!noPadding && 'mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8', !noPadding && fluid && 'max-w-none', className)}>
        {(title || description || actions) && !noPadding && (
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
