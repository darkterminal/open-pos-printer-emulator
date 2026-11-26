import { Link, router, usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AuthProps = { auth?: { user?: { name?: string; email?: string } | null } };

export function AppShell({ children, className }: PropsWithChildren<{ className?: string }>) {
  const page = usePage<AuthProps>();
  const user = page.props.auth?.user;
  const url = page.url;

  const nav = [
    { href: '/jobs', label: 'Jobs' },
    { href: '/listeners', label: 'Listeners' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 rounded-xl border bg-card/80 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight">Open POS Printer Emulator</div>
            <div className="text-sm text-muted-foreground">ESC/POS ingest, preview, and listener control</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {nav.map((item) => {
              const active = url === item.href || url.startsWith(`${item.href}?`) || url.startsWith(`${item.href}/`);
              return (
                <Button key={item.href} asChild variant={active ? 'secondary' : 'ghost'} size="sm">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.post('/logout')}
              >
                Logout
              </Button>
            )}
          </div>
        </header>
        <main className={cn('space-y-6', className)}>{children}</main>
      </div>
    </div>
  );
}
