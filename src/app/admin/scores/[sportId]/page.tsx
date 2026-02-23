import { getSheetData } from "@/lib/google-sheets";
import { AVAILABLE_YEARS, CURRENT_YEAR, SHEET_NAMES } from "@/lib/constants";
import { Sport, SportEvent, Score, Region } from "@/types";
import { parseScore } from "@/lib/parse-scores";
import { ScoreDetailClient } from "./ScoreDetailClient";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{
        sportId: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getSportScoreData(sportId: string, selectedYear: number) {
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
        .map((row: any) => parseScore(row))
        .filter((score) => (score.year ?? CURRENT_YEAR) === selectedYear);

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

export default async function ScoreDetailPage({ params, searchParams }: PageProps) {
    const query = await searchParams;
    const { sportId } = await params;
    const queryYear = Number(query.year);
    const selectedYear = AVAILABLE_YEARS.includes(queryYear as (typeof AVAILABLE_YEARS)[number])
        ? queryYear
        : CURRENT_YEAR;
    const data = await getSportScoreData(sportId, selectedYear);

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
                selectedYear={selectedYear}
            />
        </div>
    );
}
