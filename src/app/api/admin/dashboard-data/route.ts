import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { Sport, Region, SportEvent, Score } from '@/types';
import { parseScore } from '@/lib/parse-scores';

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

        const scores: Score[] = scoresRaw.map((row) => parseScore(row));

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
