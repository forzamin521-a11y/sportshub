import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSheetData, appendSheetData, batchUpdateSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";
import { Score, Sport } from "@/types";
import { DEFAULT_RECORD_TYPES } from "@/lib/record-types";

interface ScoreWithRow extends Score {
    rowIndex: number; // 1-indexed sheet row (header=1, data starts at 2)
    isNew?: boolean;
}

interface EventScoreInput {
    region_id: string;
    division: string;
    expected_rank?: string;
    expected_score?: number;
    expected_medal_score?: number;
    actual_score?: number;
    actual_medal_score?: number;
    record_type?: string;
    rank?: string;
    gold?: number;
    silver?: number;
    bronze?: number;
}

function scoreToRow(score: ScoreWithRow): (string | number)[] {
    return [
        score.id,
        score.sport_id,
        score.sport_event_id ?? '',
        score.region_id,
        score.division,
        score.expected_rank ?? '',
        score.expected_score ?? 0,
        score.expected_medal_score ?? '',
        score.actual_score ?? '',
        score.actual_medal_score ?? '',
        score.sub_event_total ?? '',
        score.converted_score ?? '',
        score.confirmed_bonus ?? '',
        score.record_type ?? '',
        score.total_score ?? '',
        score.gold ?? '',
        score.silver ?? '',
        score.bronze ?? '',
        score.rank ?? '',
        score.updated_at ?? '',
    ];
}

function parseScore(row: any, index: number): ScoreWithRow {
    return {
        rowIndex: index + 2, // +2: header is row 1, data starts at row 2
        id: String(row.id),
        sport_id: String(row.sport_id),
        sport_event_id: row.sport_event_id ? String(row.sport_event_id) : undefined,
        region_id: String(row.region_id),
        division: row.division as Score["division"],
        expected_rank: row.expected_rank ? String(row.expected_rank) : undefined,
        expected_score: row.expected_score != null && row.expected_score !== '' ? Number(row.expected_score) : 0,
        expected_medal_score: row.expected_medal_score != null && row.expected_medal_score !== '' ? Number(row.expected_medal_score) : undefined,
        actual_score: row.actual_score != null && row.actual_score !== '' ? Number(row.actual_score) : undefined,
        actual_medal_score: row.actual_medal_score != null && row.actual_medal_score !== '' ? Number(row.actual_medal_score) : undefined,
        sub_event_total: row.sub_event_total != null && row.sub_event_total !== '' ? Number(row.sub_event_total) : undefined,
        converted_score: row.converted_score != null && row.converted_score !== '' ? Number(row.converted_score) : undefined,
        confirmed_bonus: row.confirmed_bonus != null && row.confirmed_bonus !== '' ? Number(row.confirmed_bonus) : undefined,
        record_type: row.record_type ? String(row.record_type) : undefined,
        total_score: row.total_score != null && row.total_score !== '' ? Number(row.total_score) : undefined,
        gold: row.gold != null && row.gold !== '' ? Number(row.gold) : undefined,
        silver: row.silver != null && row.silver !== '' ? Number(row.silver) : undefined,
        bronze: row.bronze != null && row.bronze !== '' ? Number(row.bronze) : undefined,
        rank: row.rank ? String(row.rank) : undefined,
        updated_at: row.updated_at ? String(row.updated_at) : undefined,
    };
}

export async function POST(request: Request) {
    try {
        // 1. Authentication check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "인증되지 않은 요청입니다." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            sport_id,
            mode,
            sport_event_id,
            sub_event_total,
            event_scores,
        }: {
            sport_id: string;
            mode: "save" | "recalculate";
            sport_event_id?: string;
            sub_event_total?: number;
            event_scores?: EventScoreInput[];
        } = body;

        if (!sport_id || !mode) {
            return NextResponse.json(
                { error: "sport_id와 mode는 필수입니다." },
                { status: 400 }
            );
        }

        if (mode === "save" && !sport_event_id) {
            return NextResponse.json(
                { error: "save 모드에서는 sport_event_id가 필수입니다." },
                { status: 400 }
            );
        }

        // 2. Read scores + sports in parallel (2 API calls)
        const [scoresRawData, sportsRawData] = await Promise.all([
            getSheetData(SHEET_NAMES.SCORES),
            getSheetData(SHEET_NAMES.SPORTS),
        ]);

        // 3. Find sport and get max_score
        const sport = sportsRawData.find((row) => String(row.id) === sport_id);
        if (!sport) {
            return NextResponse.json(
                { error: "종목을 찾을 수 없습니다." },
                { status: 404 }
            );
        }
        const maxScore = Number(sport.max_score) || 0;

        // 4. Parse all scores with row indices
        const allScores: ScoreWithRow[] = scoresRawData.map((row, index) =>
            parseScore(row, index)
        );

        // Filter to this sport's scores (by sport_event_id matching sport_id prefix, or by sport_id)
        let sportScores = allScores.filter((s) => s.sport_id === sport_id);

        // 5. Build record types map for O(1) lookup
        const recordTypesMap = new Map(
            DEFAULT_RECORD_TYPES.map((rt) => [rt.id, rt])
        );

        const now = new Date().toISOString();

        // 6. If mode === 'save': upsert event scores
        const newScores: ScoreWithRow[] = [];

        if (mode === "save" && event_scores && sport_event_id) {
            for (const input of event_scores) {
                // Find existing score by sport_event_id + region_id
                const existing = sportScores.find(
                    (s) =>
                        s.sport_event_id === sport_event_id &&
                        s.region_id === input.region_id
                );

                if (existing) {
                    // Update existing score in-memory
                    existing.expected_rank = input.expected_rank;
                    existing.expected_score = input.expected_score ?? 0;
                    existing.expected_medal_score = input.expected_medal_score;
                    existing.actual_score = input.actual_score;
                    existing.actual_medal_score = input.actual_medal_score;
                    existing.record_type = input.record_type;
                    existing.rank = input.rank;
                    existing.gold = input.gold;
                    existing.silver = input.silver;
                    existing.bronze = input.bronze;
                    existing.sub_event_total = sub_event_total;
                    existing.updated_at = now;
                } else {
                    // Only create if there's meaningful data
                    if (
                        (input.actual_score || 0) > 0 ||
                        (input.expected_score || 0) > 0
                    ) {
                        const newScore: ScoreWithRow = {
                            rowIndex: -1, // Will be appended
                            isNew: true,
                            id: crypto.randomUUID(),
                            sport_id,
                            sport_event_id,
                            region_id: input.region_id,
                            division: input.division as Score["division"],
                            expected_rank: input.expected_rank,
                            expected_score: input.expected_score ?? 0,
                            expected_medal_score: input.expected_medal_score,
                            actual_score: input.actual_score,
                            actual_medal_score: input.actual_medal_score,
                            record_type: input.record_type,
                            rank: input.rank,
                            gold: input.gold,
                            silver: input.silver,
                            bronze: input.bronze,
                            sub_event_total: sub_event_total,
                            updated_at: now,
                        };
                        newScores.push(newScore);
                        sportScores.push(newScore);
                    }
                }
            }

            // Update sub_event_total for ALL scores in this event
            if (sub_event_total !== undefined) {
                sportScores
                    .filter((s) => s.sport_event_id === sport_event_id)
                    .forEach((s) => {
                        s.sub_event_total = sub_event_total;
                    });
            }
        }

        // 7. Calculate alphaScore
        const subEventTotals = new Map<string, number>();
        sportScores.forEach((score) => {
            if (score.sport_event_id && score.sub_event_total) {
                subEventTotals.set(score.sport_event_id, score.sub_event_total);
            }
        });
        const totalNationalScore = Array.from(subEventTotals.values()).reduce(
            (sum, v) => sum + v,
            0
        );
        const alphaScore =
            totalNationalScore > 0 ? maxScore / totalNationalScore : 0;

        // 8. Recalculate ALL scores for this sport
        sportScores.forEach((score) => {
            const actualScore = score.actual_score || 0;
            const actualMedalScore = score.actual_medal_score || 0;

            // converted_score = (획득성적 × 알점수) + 메달득점
            const convertedScore = actualScore * alphaScore + actualMedalScore;

            // confirmed_bonus = 획득성적 × (신기록가산배율 / 100)
            const recordType = recordTypesMap.get(score.record_type || "");
            const confirmedBonus =
                recordType && recordType.bonus_percentage > 0
                    ? actualScore * (recordType.bonus_percentage / 100)
                    : 0;

            // total_score = 환산점수 + 확정자가산
            const totalScore = convertedScore + confirmedBonus;

            score.converted_score = convertedScore;
            score.confirmed_bonus = confirmedBonus;
            score.total_score = totalScore;
            score.updated_at = now;
        });

        // 9. Build batch update data
        const updatePairs: {
            range: string;
            values: (string | number | boolean)[][];
        }[] = [];

        const appendRows: (string | number)[][] = [];

        for (const score of sportScores) {
            const row = scoreToRow(score);
            if (score.isNew) {
                appendRows.push(row);
            } else {
                updatePairs.push({
                    range: `A${score.rowIndex}:T${score.rowIndex}`,
                    values: [row],
                });
            }
        }

        // 10. Write to Google Sheets (1-2 API calls)
        const writePromises: Promise<void>[] = [];

        if (updatePairs.length > 0) {
            writePromises.push(
                batchUpdateSheetData(SHEET_NAMES.SCORES, updatePairs)
            );
        }
        if (appendRows.length > 0) {
            writePromises.push(
                appendSheetData(SHEET_NAMES.SCORES, appendRows)
            );
        }

        await Promise.all(writePromises);

        // 11. Build response scores (without internal fields)
        const responseScores: Score[] = sportScores.map(
            ({ rowIndex, isNew, ...score }) => score
        );

        return NextResponse.json({
            message:
                mode === "save"
                    ? "점수가 저장되고 환산점수가 재계산되었습니다."
                    : "환산점수가 재계산되었습니다.",
            data: {
                scores: responseScores,
                alphaScore,
                totalNationalScore,
                maxScore,
                updatedCount: updatePairs.length,
                newCount: appendRows.length,
            },
        });
    } catch (error: any) {
        console.error("Error in save-and-recalculate:", error);

        if (
            error?.message?.includes("한도") ||
            error?.message?.includes("quota") ||
            error?.code === 429
        ) {
            return NextResponse.json(
                { error: "Google Sheets API 한도 초과: 잠시 후 다시 시도해주세요." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: error?.message || "점수 저장/재계산 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
