import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen p-6 space-y-6 relative">
            <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
                <div className="glass-card p-5 min-w-[260px]">
                    <div className="flex items-center gap-3 text-primary">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="font-semibold">로딩 중</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        데이터를 동기화하고 있습니다.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card h-24 animate-pulse" />
                <div className="glass-card h-24 animate-pulse" />
                <div className="glass-card h-24 animate-pulse" />
            </div>

            <div className="glass-card h-80 animate-pulse" />
        </div>
    );
}
