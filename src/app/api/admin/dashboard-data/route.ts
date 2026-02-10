import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { Sport, Region, SportEvent, Score } from '@/types';

// GET: Fetch all data needed for admin dashboard in one call
export async function GET() {
    try {
        // Fetch all data in parallel
        const [sportsRaw, regionsRaw, eventsRaw, scoresRaw] = await Promise.all([
            getSheetData(SHEET_NAMES.SPORTS),
            getSheetData(SHEET_NAMES.REGIONS),
            getSheetData(SHEET_NAMES.SPORT_EVENTS).catch(() => []),
            getSheetData(SHEET_NAMES.SCORES).catch(() => []),
        ]);

        const sports: Sport[] = sportsRaw.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            sub_name: row.sub_name ? String(row.sub_name) : undefined,
            max_score: Number(row.max_score || 0),
            category: row.category ? String(row.category) : undefined,
        }));

        const regions: Region[] = regionsRaw.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            is_host: String(row.is_host).toLowerCase() === 'true',
            color: String(row.color),
        }));

        const sportEvents: SportEvent[] = eventsRaw.map((row) => ({
            id: String(row.id),
            sport_id: String(row.sport_id),
            division: String(row.division) as SportEvent['division'],
            event_name: String(row.event_name),
            max_score: row.max_score ? Number(row.max_score) : undefined,
        }));

        const scores: Score[] = scoresRaw.map((row) => ({
            id: String(row.id),
            sport_id: String(row.sport_id),
            sport_event_id: row.sport_event_id ? String(row.sport_event_id) : undefined,
            region_id: String(row.region_id),
            division: String(row.division) as Score['division'],
            expected_rank: row.expected_rank ? String(row.expected_rank) : undefined,
            expected_score: Number(row.expected_score || 0),
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

        return NextResponse.json({
            data: {
                sports,
                regions,
                sportEvents,
                scores,
            }
        });
    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
