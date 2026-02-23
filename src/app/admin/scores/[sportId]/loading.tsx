import { Loader2 } from "lucide-react";

export default function AdminScoreDetailLoading() {
    return (
        <div className="flex min-h-[35vh] items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                세부종목 점수 화면을 준비하는 중...
            </div>
        </div>
    );
}
