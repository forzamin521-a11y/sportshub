import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSheetData, appendSheetData, batchUpdateSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES, DEFAULT_YEAR, CURRENT_YEAR } from "@/lib/constants";
import { Score } from "@/types";
import { DEFAULT_RECORD_TYPES } from "@/lib/record-types";
import { parseScore as parseScoreBase, scoreToRow as scoreToRowBase } from "@/lib/parse-scores";
import { calculateAlphaScoreFromTotals, calculateConvertedTotal, createRecordTypeMap, getUniqueEventTotals } from "@/lib/score-calculations";

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
    expected_record_type?: string;
    rank?: string;
    gold?: number;
    silver?: number;
    bronze?: number;
    match_date?: string;
}

const scoreSaveLocks = (globalThis as typeof globalThis & {
    __scoreSaveLocks?: Set<string>;
}).__scoreSaveLocks || new Set<string>();

(globalThis as typeof globalThis & { __scoreSaveLocks?: Set<string> }).__scoreSaveLocks = scoreSaveLocks;

function scoreToRow(score: ScoreWithRow): (string | number)[] {
    return scoreToRowBase(score);
}

function parseScore(row: unknown, index: number): ScoreWithRow {
    return {
        ...parseScoreBase(row),
        rowIndex: index + 2, // +2: header is row 1, data starts at row 2
    };
}

export async function POST(request: Request) {
    let lockKey: string | null = null;
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
            expected_sub_event_total,
            year,
            event_scores,
        }: {
            sport_id: string;
            mode: "save" | "recalculate";
            sport_event_id?: string;
            sub_event_total?: number;
            expected_sub_event_total?: number;
            year?: number;
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
        const targetYear = Number(year) || CURRENT_YEAR;
        lockKey = `${sport_id}:${targetYear}`;
        if (scoreSaveLocks.has(lockKey)) {
            return NextResponse.json(
                { error: "해당 종목/연도의 저장 작업이 진행 중입니다. 잠시 후 다시 시도해주세요." },
                { status: 409 }
            );
        }
        scoreSaveLocks.add(lockKey);

        // 4. Parse all scores with row indices
        const allScores: ScoreWithRow[] = scoresRawData.map((row, index) =>
            parseScore(row, index)
        );

        // Filter to this sport's scores (by sport_event_id matching sport_id prefix, or by sport_id)
        const sportScores = allScores.filter(
            (s) => s.sport_id === sport_id && (s.year ?? DEFAULT_YEAR) === targetYear
        );

        // 5. Build record types map for O(1) lookup
        const recordTypesMap = createRecordTypeMap(DEFAULT_RECORD_TYPES);

        const now = new Date().toISOString();

        // 6. If mode === 'save': upsert event scores
        const newScores: ScoreWithRow[] = [];

        if (mode === "save" && event_scores && sport_event_id) {
            for (const input of event_scores) {
                // Find existing score by sport_event_id + region_id
                const existing = sportScores.find(
                    (s) =>
                        s.sport_event_id === sport_event_id &&
                        s.region_id === input.region_id &&
                        (s.year ?? DEFAULT_YEAR) === targetYear
                );

                if (existing) {
                    // Update existing score in-memory
                    existing.expected_rank = input.expected_rank;
                    existing.expected_score = input.expected_score ?? 0;
                    existing.expected_medal_score = input.expected_medal_score;
                    existing.actual_score = input.actual_score;
                    existing.actual_medal_score = input.actual_medal_score;
                    existing.record_type = input.record_type;
                    existing.expected_record_type = input.expected_record_type;
                    existing.rank = input.rank;
                    existing.gold = input.gold;
                    existing.silver = input.silver;
                    existing.bronze = input.bronze;
                    existing.sub_event_total = sub_event_total;
                    existing.expected_sub_event_total = expected_sub_event_total;
                    existing.match_date = input.match_date;
                    existing.year = targetYear;
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
                            expected_record_type: input.expected_record_type,
                            rank: input.rank,
                            gold: input.gold,
                            silver: input.silver,
                            bronze: input.bronze,
                            match_date: input.match_date,
                            sub_event_total: sub_event_total,
                            expected_sub_event_total: expected_sub_event_total,
                            updated_at: now,
                            year: targetYear,
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

            // Update expected_sub_event_total for ALL scores in this event
            if (expected_sub_event_total !== undefined) {
                sportScores
                    .filter((s) => s.sport_event_id === sport_event_id)
                    .forEach((s) => {
                        s.expected_sub_event_total = expected_sub_event_total;
                    });
            }
        }

        // 7. Calculate alphaScore (actual)
        const subEventTotals = getUniqueEventTotals(sportScores, "sub_event_total");
        const {
            alphaScore,
            totalNationalScore,
        } = calculateAlphaScoreFromTotals(maxScore, subEventTotals.values());

        // 7b. Calculate expectedAlphaScore (expected_sub_event_total only, no fallback)
        const expectedSubEventTotals = getUniqueEventTotals(sportScores, "expected_sub_event_total");
        const {
            alphaScore: expectedAlphaScore,
            totalNationalScore: expectedTotalNationalScore,
        } = calculateAlphaScoreFromTotals(maxScore, expectedSubEventTotals.values());

        // 8. Recalculate ALL scores for this sport (actual + expected)
        sportScores.forEach((score) => {
            const actualTotals = calculateConvertedTotal(
                score.actual_score || 0,
                score.actual_medal_score || 0,
                alphaScore,
                score.record_type,
                recordTypesMap
            );

            score.converted_score = actualTotals.convertedScore;
            score.confirmed_bonus = actualTotals.confirmedBonus;
            score.total_score = actualTotals.totalScore;

            // Expected calculations
            const expectedTotals = calculateConvertedTotal(
                score.expected_score || 0,
                score.expected_medal_score || 0,
                expectedAlphaScore,
                score.expected_record_type,
                recordTypesMap
            );

            score.expected_converted_score = expectedTotals.convertedScore;
            score.expected_confirmed_bonus = expectedTotals.confirmedBonus;
            score.expected_total_score = expectedTotals.totalScore;

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
                    range: `A${score.rowIndex}:AA${score.rowIndex}`,
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

        // 11. Verify write consistency (best-effort)
        const verifyRawData = await getSheetData(SHEET_NAMES.SCORES);
        const verifyIds = new Set(
            verifyRawData
                .map((row) => parseScoreBase(row))
                .filter((s) => s.sport_id === sport_id && (s.year ?? DEFAULT_YEAR) === targetYear)
                .map((s) => s.id)
        );

        const missingIds = sportScores
            .map((s) => s.id)
            .filter((id) => !verifyIds.has(id));

        if (missingIds.length > 0) {
            throw new Error("저장 검증에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        // 12. Build response scores (without internal fields)
        const responseScores: Score[] = sportScores.map((score) =>
            Object.fromEntries(
                Object.entries(score).filter(
                    ([key]) => key !== "rowIndex" && key !== "isNew"
                )
            ) as Score
        );

        return NextResponse.json({
            message:
                mode === "save"
                    ? "점수가 저장되고 환산점수가 재계산되었습니다."
                    : "환산점수가 재계산되었습니다.",
            data: {
                scores: responseScores,
                alphaScore,
                expectedAlphaScore,
                totalNationalScore,
                expectedTotalNationalScore,
                maxScore,
                updatedCount: updatePairs.length,
                newCount: appendRows.length,
            },
        });
    } catch (error) {
        console.error("Error in save-and-recalculate:", error);

        const message = error instanceof Error ? error.message : "";
        if (
            message.includes("한도") ||
            message.includes("quota")
        ) {
            return NextResponse.json(
                { error: "Google Sheets API 한도 초과. 1분 후 다시 시도해주세요." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: message || "점수 저장/재계산 중 오류가 발생했습니다." },
            { status: 500 }
        );
    } finally {
        if (lockKey) {
            scoreSaveLocks.delete(lockKey);
        }
    }
}
