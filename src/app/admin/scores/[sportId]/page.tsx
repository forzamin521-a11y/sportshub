import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";
import { Sport, SportEvent, Score, Region } from "@/types";
import { ScoreDetailClient } from "./ScoreDetailClient";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{
        sportId: string;
    }>;
}

async function getSportScoreData(sportId: string) {
    const [sportsData, eventsData, scoresData, regionsData] = await Promise.all([
        getSheetData(SHEET_NAMES.SPORTS),
        getSheetData(SHEET_NAMES.SPORT_EVENTS).catch(() => []),
        getSheetData(SHEET_NAMES.SCORES).catch(() => []),
        getSheetData(SHEET_NAMES.REGIONS).catch(() => []),
    ]);

    // Find the sport
    const sportRow = sportsData.find(row => String(row.id) === sportId);
    if (!sportRow) {
        return null;
    }

    const sport: Sport = {
        id: String(sportRow.id),
        name: String(sportRow.name),
        sub_name: sportRow.sub_name ? String(sportRow.sub_name) : undefined,
        max_score: Number(sportRow.max_score),
        category: String(sportRow.category),
    };

    // Get events for this sport
    const events: SportEvent[] = eventsData
        .filter((row: any) => String(row.sport_id) === sportId)
        .map((row: any) => ({
            id: String(row.id),
            sport_id: String(row.sport_id),
            division: String(row.division) as SportEvent['division'],
            event_name: String(row.event_name),
            max_score: row.max_score ? Number(row.max_score) : undefined,
        }));

    // Get scores for this sport's events (by sport_event_id or sport_id fallback)
    const eventIds = new Set(events.map(e => e.id));
    const scores: Score[] = scoresData
        .filter((row: any) =>
            eventIds.has(String(row.sport_event_id)) ||
            String(row.sport_id) === sportId
        )
        .map((row: any) => ({
            id: String(row.id),
            sport_id: String(row.sport_id),
            sport_event_id: row.sport_event_id ? String(row.sport_event_id) : undefined,
            region_id: String(row.region_id),
            division: String(row.division) as Score['division'],
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
        }));

    // Get regions
    const regions: Region[] = regionsData.map(row => ({
        id: String(row.id),
        name: String(row.name),
        is_host: String(row.is_host).toLowerCase() === 'true',
        color: String(row.color),
    }));

    return {
        sport,
        events,
        scores,
        regions,
    };
}

export default async function ScoreDetailPage({ params }: PageProps) {
    const { sportId } = await params;
    const data = await getSportScoreData(sportId);

    if (!data) {
        notFound();
    }

    return (
        <div className="space-y-5 animate-fade-in-up">
            <ScoreDetailClient
                sport={data.sport}
                events={data.events}
                initialScores={data.scores}
                regions={data.regions}
            />
        </div>
    );
}
