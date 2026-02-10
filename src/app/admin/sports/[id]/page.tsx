import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";
import { Sport, SportEvent, RankScoreConfig } from "@/types";
import { SportDetailClient } from "./SportDetailClient";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

async function getSportData(sportId: string) {
    const [sportsData, eventsData, rankScoresData] = await Promise.all([
        getSheetData(SHEET_NAMES.SPORTS),
        getSheetData(SHEET_NAMES.SPORT_EVENTS).catch(() => []),
        getSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS).catch(() => []),
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

    // Get rank scores for this sport's events
    const eventIds = new Set(events.map(e => e.id));
    const rankScores: RankScoreConfig[] = rankScoresData
        .filter((row: any) => eventIds.has(String(row.sport_event_id)))
        .map((row: any) => ({
            id: String(row.id),
            sport_event_id: String(row.sport_event_id),
            rank: String(row.rank),
            rank_label: row.rank_label ? String(row.rank_label) : `${row.rank}위`,
            acquired_score: Number(row.acquired_score),
            medal_score: Number(row.medal_score),
            updated_at: row.updated_at ? String(row.updated_at) : undefined,
        }));

    return {
        sport,
        events,
        rankScores,
    };
}

export default async function SportDetailPage({ params }: PageProps) {
    const { id } = await params;
    const data = await getSportData(id);

    if (!data) {
        notFound();
    }

    return (
        <div className="space-y-5 animate-fade-in-up">
            <SportDetailClient
                sport={data.sport}
                events={data.events}
                initialRankScores={data.rankScores}
            />
        </div>
    );
}
