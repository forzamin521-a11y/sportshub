import { Loader2 } from "lucide-react";

export default function AdminScoresLoading() {
    return (
        <div className="flex min-h-[35vh] items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                점수 관리 데이터를 불러오는 중...
            </div>
        </div>
    );
}
