import { Loader2 } from "lucide-react";

export default function AdminLoading() {
    return (
        <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex items-center gap-3 rounded-xl border bg-background/90 px-4 py-3 shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="text-sm">
                    <p className="font-medium">관리자 데이터를 불러오는 중입니다.</p>
                    <p className="text-muted-foreground">잠시만 기다려주세요.</p>
                </div>
            </div>
        </div>
    );
}
