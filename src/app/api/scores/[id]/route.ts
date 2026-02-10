import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, updateSheetData, deleteSheetRow } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { Score } from '@/types';

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

// GET: Fetch a single score by ID
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const rawData = await getSheetData(SHEET_NAMES.SCORES);

        const scoreRow = rawData.find((row) => String(row.id) === id);

        if (!scoreRow) {
            return NextResponse.json({ error: 'Score not found' }, { status: 404 });
        }

        const score: Score = {
            id: String(scoreRow.id),
            sport_id: String(scoreRow.sport_id),
            sport_event_id: scoreRow.sport_event_id ? String(scoreRow.sport_event_id) : undefined,
            region_id: String(scoreRow.region_id),
            division: String(scoreRow.division) as Score['division'],
            expected_rank: scoreRow.expected_rank ? String(scoreRow.expected_rank) : undefined,
            expected_score: Number(scoreRow.expected_score),
            expected_medal_score: scoreRow.expected_medal_score ? Number(scoreRow.expected_medal_score) : undefined,
            actual_score: scoreRow.actual_score ? Number(scoreRow.actual_score) : undefined,
            actual_medal_score: scoreRow.actual_medal_score ? Number(scoreRow.actual_medal_score) : undefined,
            sub_event_total: scoreRow.sub_event_total ? Number(scoreRow.sub_event_total) : undefined,
            converted_score: scoreRow.converted_score ? Number(scoreRow.converted_score) : undefined,
            confirmed_bonus: scoreRow.confirmed_bonus ? Number(scoreRow.confirmed_bonus) : undefined,
            record_type: scoreRow.record_type ? String(scoreRow.record_type) : undefined,
            total_score: scoreRow.total_score ? Number(scoreRow.total_score) : undefined,
            gold: scoreRow.gold ? Number(scoreRow.gold) : undefined,
            silver: scoreRow.silver ? Number(scoreRow.silver) : undefined,
            bronze: scoreRow.bronze ? Number(scoreRow.bronze) : undefined,
            rank: scoreRow.rank ? String(scoreRow.rank) : undefined,
            updated_at: scoreRow.updated_at ? String(scoreRow.updated_at) : undefined,
        };

        return NextResponse.json({ data: score });
    } catch (error) {
        console.error('Failed to fetch score:', error);
        return NextResponse.json({ error: 'Failed to fetch score' }, { status: 500 });
    }
}

// PUT: Update a score by ID
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();

        // Find existing data
        const rawData = await getSheetData(SHEET_NAMES.SCORES);
        const rowIndex = rawData.findIndex((row) => String(row.id) === id);

        if (rowIndex === -1) {
            return NextResponse.json({ error: 'Score not found' }, { status: 404 });
        }

        const existingScore = rawData[rowIndex];
        const updatedAt = new Date().toISOString();

        // Get the sport_event_id and rank
        const sportEventId = body.sport_event_id ?? (existingScore.sport_event_id ? String(existingScore.sport_event_id) : '');
        const rank = body.rank !== undefined ? String(body.rank) : (existingScore.rank ? String(existingScore.rank) : undefined);

        // If rank is provided and sport_event_id exists, calculate scores from rank config
        let calculated: { acquired_score: number; medal_score: number; gold: number; silver: number; bronze: number } | null = null;
        if (rank && sportEventId && body.rank !== undefined) {
            // Only calculate if rank was explicitly provided in the update
            calculated = await calculateScoreFromRank(sportEventId, rank);
        }

        // Merge updated data with existing
        let actual_score = body.actual_score ?? (existingScore.actual_score ? Number(existingScore.actual_score) : '');
        let actual_medal_score = body.actual_medal_score ?? (existingScore.actual_medal_score ? Number(existingScore.actual_medal_score) : '');
        let gold = body.gold ?? (existingScore.gold ? Number(existingScore.gold) : '');
        let silver = body.silver ?? (existingScore.silver ? Number(existingScore.silver) : '');
        let bronze = body.bronze ?? (existingScore.bronze ? Number(existingScore.bronze) : '');

        // Apply calculated values if rank was updated
        if (calculated) {
            actual_score = calculated.acquired_score;
            actual_medal_score = calculated.medal_score;
            gold = calculated.gold;
            silver = calculated.silver;
            bronze = calculated.bronze;
        }

        const confirmed_bonus = body.confirmed_bonus ?? (existingScore.confirmed_bonus ? Number(existingScore.confirmed_bonus) : '');

        // Calculate total_score
        const actualScoreNum = typeof actual_score === 'number' ? actual_score : 0;
        const actualMedalScoreNum = typeof actual_medal_score === 'number' ? actual_medal_score : 0;
        const confirmedBonusNum = typeof confirmed_bonus === 'number' ? confirmed_bonus : 0;
        const total_score = actualScoreNum + actualMedalScoreNum + confirmedBonusNum;

        const updatedScore = {
            id,
            sport_id: body.sport_id ?? String(existingScore.sport_id),
            sport_event_id: sportEventId,
            region_id: body.region_id ?? String(existingScore.region_id),
            division: body.division ?? String(existingScore.division),
            expected_rank: body.expected_rank ?? (existingScore.expected_rank ? String(existingScore.expected_rank) : ''),
            expected_score: body.expected_score ?? Number(existingScore.expected_score) ?? 0,
            expected_medal_score: body.expected_medal_score ?? (existingScore.expected_medal_score ? Number(existingScore.expected_medal_score) : ''),
            actual_score,
            actual_medal_score,
            sub_event_total: body.sub_event_total ?? (existingScore.sub_event_total ? Number(existingScore.sub_event_total) : ''),
            converted_score: body.converted_score ?? (existingScore.converted_score ? Number(existingScore.converted_score) : ''),
            confirmed_bonus,
            record_type: body.record_type ?? (existingScore.record_type ? String(existingScore.record_type) : ''),
            total_score: total_score || '',
            gold,
            silver,
            bronze,
            rank: rank ?? '',
            updated_at: updatedAt,
        };

        // Update Google Sheets (row index + 2 because of header row and 0-based index)
        const updatedRow: (string | number)[] = [
            updatedScore.id,
            updatedScore.sport_id,
            updatedScore.sport_event_id,
            updatedScore.region_id,
            updatedScore.division,
            updatedScore.expected_rank,
            updatedScore.expected_score,
            updatedScore.expected_medal_score,
            updatedScore.actual_score,
            updatedScore.actual_medal_score,
            updatedScore.sub_event_total,
            updatedScore.converted_score,
            updatedScore.confirmed_bonus,
            updatedScore.record_type,
            updatedScore.total_score,
            updatedScore.gold,
            updatedScore.silver,
            updatedScore.bronze,
            updatedScore.rank,
            updatedScore.updated_at,
        ];

        const sheetRow = rowIndex + 2; // +1 for header, +1 for 1-based index
        const range = `A${sheetRow}:T${sheetRow}`; // T is the 20th column (updated_at)
        await updateSheetData(SHEET_NAMES.SCORES, range, [updatedRow]);

        return NextResponse.json({
            message: 'Score updated successfully',
            data: updatedScore,
        });
    } catch (error) {
        console.error('Failed to update score:', error);
        return NextResponse.json({ error: 'Failed to update score' }, { status: 500 });
    }
}

// DELETE: Delete a score by ID
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { id } = await context.params;

        // Find existing data
        const rawData = await getSheetData(SHEET_NAMES.SCORES);
        const rowIndex = rawData.findIndex((row) => String(row.id) === id);

        if (rowIndex === -1) {
            return NextResponse.json({ error: 'Score not found' }, { status: 404 });
        }

        // Delete from Google Sheets
        await deleteSheetRow(SHEET_NAMES.SCORES, rowIndex);

        return NextResponse.json({ message: 'Score deleted successfully' });
    } catch (error) {
        console.error('Failed to delete score:', error);
        return NextResponse.json({ error: 'Failed to delete score' }, { status: 500 });
    }
}
