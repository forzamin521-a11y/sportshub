import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-semibold">데이터를 불러오는 중입니다</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                    버튼을 누른 후 잠시만 기다려 주세요.
                </p>
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

