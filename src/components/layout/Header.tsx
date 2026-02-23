'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { User, LogOut, Trophy } from 'lucide-react';
import { AVAILABLE_YEARS, getFestivalLabel, CURRENT_YEAR } from '@/lib/constants';

const NAV_ITEMS = [
    { name: '대시보드', href: '/' },
    { name: '종목별 성적', href: '/sports-performance' },
    { name: '시도별 비교', href: '/region-comparison' },
    { name: '예상대비실적', href: '/expected-vs-actual' },
    { name: '일자별 결과', href: '/daily-results' },
];

export function Header() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session } = useSession();

    const currentYear = searchParams.get('year') ? Number(searchParams.get('year')) : CURRENT_YEAR;
    const festivalLabel = getFestivalLabel(currentYear);

    function handleYearChange(year: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('year', year);
        router.push(`${pathname}?${params.toString()}`);
    }

    function buildHref(href: string) {
        const yearParam = searchParams.get('year');
        if (yearParam) {
            return `${href}?year=${yearParam}`;
        }
        return href;
    }

    return (
        <header className="sticky top-0 z-50 w-full glass-strong">
            <div className="container flex h-14 items-center justify-between px-4">
                {/* Logo */}
                <div className="mr-4 hidden md:flex items-center">
                    <Link href={buildHref('/')} className="mr-6 flex items-center gap-2 font-bold">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Trophy className="h-4 w-4 text-primary" />
                        </div>
                        <span className="hidden font-bold sm:inline-block gradient-text">
                            경기도 - {festivalLabel}
                        </span>
                    </Link>
                    {/* Year Selector */}
                    <Select value={String(currentYear)} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-[100px] h-8 text-xs mr-4">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {AVAILABLE_YEARS.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                    {year}년
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <nav className="flex items-center gap-1 text-sm font-medium">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={buildHref(item.href)}
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
                <div className="flex md:hidden items-center gap-2">
                    <Link href={buildHref('/')} className="flex items-center gap-2 font-bold">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Trophy className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-bold gradient-text text-sm">{festivalLabel}</span>
                    </Link>
                    <Select value={String(currentYear)} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-[80px] h-7 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {AVAILABLE_YEARS.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                    {year}년
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
