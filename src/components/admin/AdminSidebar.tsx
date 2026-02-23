"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Trophy, Crown, Settings, ArrowLeft } from "lucide-react";

const sidebarItems = [
    { name: "대시보드", href: "/admin", icon: LayoutDashboard },
    { name: "점수 관리", href: "/admin/scores", icon: Trophy },
    { name: "종목 관리", href: "/admin/sports", icon: Crown },
    { name: "설정", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden lg:block w-60 min-h-screen glass-strong border-r border-border/30">
            <div className="flex h-full max-h-screen flex-col">
                <div className="flex h-14 items-center px-5 border-b border-border/30">
                    <Link className="flex items-center gap-2.5 font-semibold" href="/admin">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <LayoutDashboard className="h-4 w-4 text-primary" />
                        </div>
                        <span className="gradient-text text-sm font-bold">관리자</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-4 px-3">
                    <nav className="grid gap-1">
                        {sidebarItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                                    pathname === item.href
                                        ? "bg-primary/10 text-primary font-semibold shadow-sm"
                                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="p-3 border-t border-border/30">
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        대시보드로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}
