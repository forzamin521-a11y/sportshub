import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSheetData, updateSheetData } from "@/lib/google-sheets";
import { Score, Sport } from "@/types";

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
                rowIndex: index + 2, // +2 for header row (1-indexed)
                id: String(row.id),
                sport_id: String(row.sport_id),
                sport_event_id: row.sport_event_id ? String(row.sport_event_id) : undefined,
                region_id: String(row.region_id),
                division: row.division,
                expected_rank: row.expected_rank ? String(row.expected_rank) : undefined,
                expected_score: parseFloat(row.expected_score) || 0,
                expected_medal_score: row.expected_medal_score ? parseFloat(row.expected_medal_score) : undefined,
                actual_score: row.actual_score ? parseFloat(row.actual_score) : undefined,
                actual_medal_score: row.actual_medal_score ? parseFloat(row.actual_medal_score) : undefined,
                sub_event_total: row.sub_event_total ? parseFloat(row.sub_event_total) : undefined,
                converted_score: row.converted_score ? parseFloat(row.converted_score) : undefined,
                confirmed_bonus: row.confirmed_bonus ? parseFloat(row.confirmed_bonus) : undefined,
                record_type: row.record_type ? String(row.record_type) : undefined,
                total_score: row.total_score ? parseFloat(row.total_score) : undefined,
                gold: row.gold ? parseInt(row.gold) : undefined,
                silver: row.silver ? parseInt(row.silver) : undefined,
                bronze: row.bronze ? parseInt(row.bronze) : undefined,
                rank: row.rank ? String(row.rank) : undefined,
                updated_at: row.updated_at,
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
        const 득점총계 = sportScores.reduce((sum, s) => sum + (s.sub_event_total || 0), 0);

        if (득점총계 === 0) {
            return NextResponse.json(
                { error: "득점총계가 0입니다. 세부종목별 전체점수합계를 확인하세요." },
                { status: 400 }
            );
        }

        // Calculate 알점수
        const 알점수 = 확정점수 / 득점총계;

        // Update each score with converted_score
        const updates: Promise<void>[] = [];
        const updatedScores: Score[] = [];

        for (const score of sportScores) {
            const 획득성적 = score.actual_score || 0;
            const 메달득점 = score.actual_medal_score || 0;

            // 환산점수 = (획득성적 × 알점수) + 메달득점
            const 환산점수 = (획득성적 * 알점수) + 메달득점;

            const updatedAt = new Date().toISOString();

            // Create updated row array in the correct column order
            const updatedRow: (string | number)[] = [
                score.id,
                score.sport_id,
                score.sport_event_id ?? '',
                score.region_id,
                score.division,
                score.expected_rank ?? '',
                score.expected_score,
                score.expected_medal_score ?? '',
                score.actual_score ?? '',
                score.actual_medal_score ?? '',
                score.sub_event_total ?? '',
                환산점수, // converted_score
                score.confirmed_bonus ?? '',
                score.record_type ?? '',
                score.total_score ?? '',
                score.gold ?? '',
                score.silver ?? '',
                score.bronze ?? '',
                score.rank ?? '',
                updatedAt,
            ];

            const sheetRow = score.rowIndex;
            const range = `A${sheetRow}:T${sheetRow}`; // T is the 20th column (updated_at)

            updates.push(updateSheetData("scores", range, [updatedRow]));

            // Store for response
            updatedScores.push({
                ...score,
                converted_score: 환산점수,
                updated_at: updatedAt,
            });
        }

        await Promise.all(updates);

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
