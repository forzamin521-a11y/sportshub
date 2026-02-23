import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES, GYEONGGI_REGION_ID } from "@/lib/constants";
import { Trophy, BarChart3, Clock, Medal } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    let scoreCount = 0;
    let sportCount = 0;
    let totalGold = 0;
    let totalSilver = 0;
    let totalBronze = 0;
    let lastUpdated = "-";

    try {
        const [scoresData, sportsData] = await Promise.all([
            getSheetData(SHEET_NAMES.SCORES),
            getSheetData(SHEET_NAMES.SPORTS),
        ]);

        const gyeonggiScores = scoresData.filter((row: any) => String(row.region_id) === GYEONGGI_REGION_ID);
        scoreCount = gyeonggiScores.length;
        sportCount = sportsData.length;
        totalGold = gyeonggiScores.reduce((sum: number, row: any) => sum + (Number(row.gold) || 0), 0);
        totalSilver = gyeonggiScores.reduce((sum: number, row: any) => sum + (Number(row.silver) || 0), 0);
        totalBronze = gyeonggiScores.reduce((sum: number, row: any) => sum + (Number(row.bronze) || 0), 0);

        const dates = gyeonggiScores
            .filter((row: any) => row.updated_at)
            .map((row: any) => new Date(String(row.updated_at)).getTime())
            .filter((t: number) => !isNaN(t));
        if (dates.length > 0) {
            const latest = new Date(Math.max(...dates));
            lastUpdated = latest.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    } catch (e) {
        // fallback to defaults
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h1 className="text-2xl font-bold gradient-text">관리자 대시보드</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    경기도 데이터를 관리하세요.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="glass-card p-5 stat-card-blue">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/15">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">등록된 점수</p>
                            <p className="text-2xl font-bold">{scoreCount}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5 stat-card-green">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-green-500/15">
                            <Trophy className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">등록된 종목</p>
                            <p className="text-2xl font-bold">{sportCount}<span className="text-sm font-normal text-muted-foreground ml-1">개</span></p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5 stat-card-amber">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-yellow-500/15">
                            <Medal className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">메달 현황</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-bold medal-gold">{totalGold}금</span>
                                <span className="text-sm font-bold medal-silver">{totalSilver}은</span>
                                <span className="text-sm font-bold medal-bronze">{totalBronze}동</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5 stat-card-purple">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/15">
                            <Clock className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">최근 업데이트</p>
                            <p className="text-sm font-semibold mt-0.5">{lastUpdated}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
