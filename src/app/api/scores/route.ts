import { NextResponse } from 'next/server';
import { getSheetData, appendSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES, DEFAULT_YEAR } from '@/lib/constants';
import { RankScoreConfig } from '@/types';
import { parseScore, filterScoresByYear } from '@/lib/parse-scores';

// Helper function to calculate score from rank
async function calculateScoreFromRank(
    sportEventId: string | undefined,
    rank: string | number | undefined
): Promise<{ acquired_score: number; medal_score: number; gold: number; silver: number; bronze: number } | null> {
    if (!sportEventId || !rank) return null;

    try {
        const rankConfigs = await getSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS);

        // Find the config for this sport event and rank (compare as strings)
        const rankStr = String(rank);
        const config = rankConfigs.find(
            (c) => String(c.sport_event_id) === sportEventId && String(c.rank) === rankStr
        );

        if (!config) return null;

        // Calculate medals based on rank (only for numeric ranks 1-3)
        const gold = rankStr === "1" ? 1 : 0;
        const silver = rankStr === "2" ? 1 : 0;
        const bronze = rankStr === "3" ? 1 : 0;

        return {
            acquired_score: Number(config.acquired_score) || 0,
            medal_score: Number(config.medal_score) || 0,
            gold,
            silver,
            bronze,
        };
    } catch (error) {
        console.error('Failed to calculate score from rank:', error);
        return null;
    }
}

// GET: Fetch all scores
export async function GET(request: Request) {
    try {
        const rawData = await getSheetData(SHEET_NAMES.SCORES);

        let scores = rawData.map((row) => parseScore(row));

        // Filtering
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        const regionId = searchParams.get('region_id');
        const sportId = searchParams.get('sport_id');
        const division = searchParams.get('division');

        if (yearParam) {
            scores = filterScoresByYear(scores, Number(yearParam));
        }
        const sortBy = searchParams.get('sort_by');
        const sortOrder = searchParams.get('sort_order') === 'desc' ? -1 : 1;

        if (regionId) {
            scores = scores.filter(s => s.region_id === regionId);
        }
        if (sportId) {
            scores = scores.filter(s => s.sport_id === sportId);
        }
        if (division) {
            scores = scores.filter(s => s.division === division);
        }

        // Sorting
        if (sortBy) {
            scores.sort((a, b) => {
                const valA = (a as any)[sortBy] ?? 0;
                const valB = (b as any)[sortBy] ?? 0;
                if (valA < valB) return -1 * sortOrder;
                if (valA > valB) return 1 * sortOrder;
                return 0;
            });
        }

        return NextResponse.json({ data: scores });
    } catch (error) {
        console.error('Failed to fetch scores:', error);
        return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
    }
}

// POST: Add a new score
export async function POST(request: Request) {
    try {
        const body = await request.json();
        let {
            sport_id, sport_event_id, region_id, division,
            expected_rank, expected_score, expected_medal_score,
            actual_score, actual_medal_score,
            sub_event_total, converted_score,
            confirmed_bonus, record_type, total_score,
            gold, silver, bronze, rank,
            expected_sub_event_total, expected_record_type,
            expected_confirmed_bonus, expected_total_score, expected_converted_score,
            year, match_date
        } = body;

        if (!sport_id || !region_id || !division) {
            return NextResponse.json({ error: 'Missing required fields (sport_id, region_id, division)' }, { status: 400 });
        }

        // If rank is provided and sport_event_id exists, calculate scores from rank config
        if (rank && sport_event_id) {
            const calculated = await calculateScoreFromRank(sport_event_id, rank);
            if (calculated) {
                // Only override if not explicitly provided
                if (actual_score === undefined || actual_score === 0) {
                    actual_score = calculated.acquired_score;
                }
                if (actual_medal_score === undefined || actual_medal_score === 0) {
                    actual_medal_score = calculated.medal_score;
                }
                if (gold === undefined || gold === 0) {
                    gold = calculated.gold;
                }
                if (silver === undefined || silver === 0) {
                    silver = calculated.silver;
                }
                if (bronze === undefined || bronze === 0) {
                    bronze = calculated.bronze;
                }
            }
        }

        // Calculate total_score if not provided
        if (!total_score) {
            total_score = (actual_score || 0) + (actual_medal_score || 0) + (confirmed_bonus || 0);
        }

        const newId = crypto.randomUUID();
        const updatedAt = new Date().toISOString();

        const newRow = [
            newId, sport_id, sport_event_id || '', region_id, division,
            expected_rank || '', expected_score || 0, expected_medal_score || '',
            actual_score || '', actual_medal_score || '',
            sub_event_total || '', converted_score || '',
            confirmed_bonus || '', record_type || '',
            total_score || '',
            gold || '', silver || '', bronze || '',
            rank || '', updatedAt,
            expected_sub_event_total || '', expected_record_type || '',
            expected_confirmed_bonus || '', expected_total_score || '', expected_converted_score || '',
            year || DEFAULT_YEAR, match_date || ''
        ];

        await appendSheetData(SHEET_NAMES.SCORES, [newRow]);

        return NextResponse.json({
            message: 'Score created',
            data: {
                id: newId,
                sport_id, sport_event_id, region_id, division,
                expected_rank, expected_score, expected_medal_score,
                actual_score, actual_medal_score,
                sub_event_total, converted_score,
                confirmed_bonus, record_type, total_score,
                gold, silver, bronze, rank,
                updated_at: updatedAt,
                expected_sub_event_total, expected_record_type,
                expected_confirmed_bonus, expected_total_score, expected_converted_score,
                year: year || DEFAULT_YEAR, match_date
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Failed to create score:', error);
        return NextResponse.json({ error: 'Failed to create score' }, { status: 500 });
    }
}
