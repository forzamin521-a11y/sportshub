import { NextResponse } from 'next/server';
import { getSheetData, appendSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { RankScoreConfig } from '@/types';

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

        let scores = rawData.map((row) => ({
            id: String(row.id),
            sport_id: String(row.sport_id),
            sport_event_id: row.sport_event_id ? String(row.sport_event_id) : undefined,
            region_id: String(row.region_id),
            division: String(row.division),
            expected_rank: row.expected_rank ? String(row.expected_rank) : undefined,
            expected_score: Number(row.expected_score),
            expected_medal_score: row.expected_medal_score ? Number(row.expected_medal_score) : undefined,
            actual_score: row.actual_score ? Number(row.actual_score) : undefined,
            actual_medal_score: row.actual_medal_score ? Number(row.actual_medal_score) : undefined,
            sub_event_total: row.sub_event_total ? Number(row.sub_event_total) : undefined,
            converted_score: row.converted_score ? Number(row.converted_score) : undefined,
            confirmed_bonus: row.confirmed_bonus ? Number(row.confirmed_bonus) : undefined,
            record_type: row.record_type ? String(row.record_type) : undefined,
            total_score: row.total_score ? Number(row.total_score) : undefined,
            gold: row.gold ? Number(row.gold) : undefined,
            silver: row.silver ? Number(row.silver) : undefined,
            bronze: row.bronze ? Number(row.bronze) : undefined,
            rank: row.rank ? String(row.rank) : undefined,
            updated_at: row.updated_at ? String(row.updated_at) : undefined,
        }));

        // Filtering
        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get('region_id');
        const sportId = searchParams.get('sport_id');
        const division = searchParams.get('division');
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
            gold, silver, bronze, rank
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
            rank || '', updatedAt
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
                updated_at: updatedAt
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Failed to create score:', error);
        return NextResponse.json({ error: 'Failed to create score' }, { status: 500 });
    }
}
