import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { batchUpdateSheetData, getSheetData } from "@/lib/google-sheets";
import { Score, Sport } from "@/types";
import { parseScore, scoreToRow } from "@/lib/parse-scores";
import { calculateAlphaScoreFromTotals, calculateConvertedScore, getUniqueEventTotals } from "@/lib/score-calculations";

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "인증되지 않은 요청입니다." },
                { status: 401 }
            );
        }

        const { sport_id } = await request.json();

        if (!sport_id) {
            return NextResponse.json(
                { error: "종목 ID가 필요합니다." },
                { status: 400 }
            );
        }

        // Fetch sports data to get max_score (확정점수)
        const sportsData = await getSheetData("sports");
        const sports: Sport[] = sportsData.map((row: any) => ({
            id: String(row.id),
            name: String(row.name),
            sub_name: row.sub_name ? String(row.sub_name) : undefined,
            max_score: parseFloat(row.max_score) || 0,
            category: row.category ? String(row.category) : undefined,
        }));

        const sport = sports.find((s) => s.id === sport_id);
        if (!sport) {
            return NextResponse.json(
                { error: "종목을 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        const 확정점수 = sport.max_score;

        // Fetch all scores for this sport
        const scoresData = await getSheetData("scores");
        const allScores: (Score & { rowIndex: number })[] = scoresData
            .map((row: any, index: number) => ({
                ...parseScore(row),
                rowIndex: index + 2, // +2 for header row (1-indexed)
            }));

        const sportScores = allScores.filter((s) => s.sport_id === sport_id);

        // Validate: Check if all scores have sub_event_total
        const missingSubEventTotal = sportScores.filter(
            (s) => s.sub_event_total === undefined || s.sub_event_total === null || s.sub_event_total === 0
        );

        if (missingSubEventTotal.length > 0) {
            return NextResponse.json(
                {
                    error: "세부종목별 전체점수합계가 입력되지 않은 데이터가 있습니다.",
                    missing_count: missingSubEventTotal.length,
                    missing_ids: missingSubEventTotal.map(s => s.id),
                },
                { status: 400 }
            );
        }

        // Calculate 득점총계 (sum of all sub_event_total)
        const uniqueEventTotals = getUniqueEventTotals(sportScores, "sub_event_total");
        const { alphaScore: 알점수, totalNationalScore: 득점총계 } = calculateAlphaScoreFromTotals(확정점수, uniqueEventTotals.values());

        if (득점총계 === 0) {
            return NextResponse.json(
                { error: "득점총계가 0입니다. 세부종목별 전체점수합계를 확인하세요." },
                { status: 400 }
            );
        }

        // Update each score with converted_score
        const updates: { range: string; values: (string | number | boolean)[][] }[] = [];
        const updatedScores: Score[] = [];

        for (const score of sportScores) {
            const 획득성적 = score.actual_score || 0;
            const 메달득점 = score.actual_medal_score || 0;

            // 환산점수 = (획득성적 × 알점수) + 메달득점
            const 환산점수 = calculateConvertedScore(획득성적, 메달득점, 알점수);

            const updatedAt = new Date().toISOString();

            // Create updated row array using scoreToRow utility (27 columns, A~AA)
            const updatedScore: Score = {
                ...score,
                converted_score: 환산점수,
                updated_at: updatedAt,
            };
            const updatedRow = scoreToRow(updatedScore);

            const sheetRow = score.rowIndex;
            const range = `A${sheetRow}:AA${sheetRow}`; // AA is the 27th column (match_date)

            updates.push({ range, values: [updatedRow] });

            // Store for response
            updatedScores.push({
                ...score,
                converted_score: 환산점수,
                updated_at: updatedAt,
            });
        }

        await batchUpdateSheetData("scores", updates);

        return NextResponse.json({
            message: "환산점수 계산이 완료되었습니다.",
            updated_count: sportScores.length,
            알점수,
            득점총계,
            확정점수,
        });
    } catch (error) {
        console.error("Error calculating converted scores:", error);
        return NextResponse.json(
            { error: "환산점수 계산 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
