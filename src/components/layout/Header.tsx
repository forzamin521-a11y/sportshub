'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, User, LogOut, Trophy } from 'lucide-react';

const NAV_ITEMS = [
    { name: '대시보드', href: '/' },
    { name: '종목별 성적', href: '/sports-performance' },
    { name: '시도별 비교', href: '/region-comparison' },
];

export function Header() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <header className="sticky top-0 z-50 w-full glass-strong">
            <div className="container flex h-14 items-center justify-between px-4">
                {/* Logo */}
                <div className="mr-4 hidden md:flex items-center">
                    <Link href="/" className="mr-8 flex items-center gap-2 font-bold">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Trophy className="h-4 w-4 text-primary" />
                        </div>
                        <span className="hidden font-bold sm:inline-block gradient-text">
                            경기도 - 제106회 전국체육대회
                        </span>
                    </Link>
                    <nav className="flex items-center gap-1 text-sm font-medium">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg transition-all",
                                    pathname === item.href
                                        ? "bg-primary/10 text-primary font-semibold"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Mobile Menu (Simplified) */}
                <div className="flex md:hidden">
                    <Link href="/" className="flex items-center gap-2 font-bold mr-4">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Trophy className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-bold gradient-text text-sm">전국체육대회</span>
                    </Link>
                </div>

                {/* Auth / Right Side */}
                <div className="flex items-center gap-1">
                    {session ? (
                        <>
                            <Link href="/admin">
                                <Button variant="ghost" size="sm" className="rounded-lg text-xs hover:bg-primary/10 hover:text-primary">
                                    관리자
                                </Button>
                            </Link>
                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/50 text-xs">
                                <User className="h-3 w-3" />
                                <span>{session.user?.name || session.user?.email}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => signOut({ callbackUrl: "/login" })}
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                <span className="sr-only">로그아웃</span>
                            </Button>
                        </>
                    ) : (
                        <Link href="/api/auth/signin">
                            <Button size="sm" className="rounded-lg text-xs">로그인</Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
