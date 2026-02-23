import { getSheetData } from "@/lib/google-sheets";
import { AVAILABLE_YEARS, CURRENT_YEAR, SHEET_NAMES } from "@/lib/constants";
import { Score, Sport, SportEvent } from "@/types";
import { ScoresGridClient } from "./ScoresGridClient";
import { parseScore } from "@/lib/parse-scores";

export const dynamic = 'force-dynamic';

interface SportWithStats extends Sport {
    eventCount: number;
    divisionCount: number;
    scoredEventCount: number;
    unscoredEventCount: number;
    scoreCompletionRate: number;
}

async function getData(targetYear: number): Promise<SportWithStats[]> {
    const [sportsData, eventsData, scoresData] = await Promise.all([
        getSheetData(SHEET_NAMES.SPORTS),
        getSheetData(SHEET_NAMES.SPORT_EVENTS).catch(() => []),
        getSheetData(SHEET_NAMES.SCORES).catch(() => []),
    ]);

    const events: SportEvent[] = eventsData.map((row) => ({
        id: String(row.id),
        sport_id: String(row.sport_id),
        division: String(row.division) as SportEvent['division'],
        event_name: String(row.event_name),
        max_score: row.max_score ? Number(row.max_score) : undefined,
    }));

    const scores: Score[] = scoresData.map((row) => parseScore(row));

    // Group events by sport_id and calculate counts
    const eventsBySport = events.reduce((acc, event) => {
        if (!acc[event.sport_id]) {
            acc[event.sport_id] = [];
        }
        acc[event.sport_id].push(event);
        return acc;
    }, {} as Record<string, SportEvent[]>);

    const scoredEventIdsBySport = scores
        .filter((score) => (score.year ?? CURRENT_YEAR) === targetYear && !!score.sport_event_id)
        .reduce((acc, score) => {
            const sportId = score.sport_id;
            if (!acc[sportId]) {
                acc[sportId] = new Set<string>();
            }
            acc[sportId].add(String(score.sport_event_id));
            return acc;
        }, {} as Record<string, Set<string>>);

    const sports: SportWithStats[] = sportsData.map((row) => {
        const sportId = String(row.id);
        const sportEvents = eventsBySport[sportId] || [];

        // Count unique divisions
        const uniqueDivisions = new Set(sportEvents.map(e => e.division));
        const scoredEventIds = scoredEventIdsBySport[sportId] || new Set<string>();
        const scoredEventCount = sportEvents.filter((event) =>
            scoredEventIds.has(event.id)
        ).length;
        const unscoredEventCount = Math.max(sportEvents.length - scoredEventCount, 0);
        const scoreCompletionRate =
            sportEvents.length > 0
                ? Math.round((scoredEventCount / sportEvents.length) * 100)
                : 0;

        return {
            id: sportId,
            name: String(row.name),
            sub_name: row.sub_name ? String(row.sub_name) : undefined,
            max_score: Number(row.max_score),
            category: String(row.category) as '구기' | '무도' | '기타',
            eventCount: sportEvents.length,
            divisionCount: uniqueDivisions.size,
            scoredEventCount,
            unscoredEventCount,
            scoreCompletionRate,
        };
    });

    return sports;
}

export default async function AdminScoresPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const queryYear = Number(params.year);
    const selectedYear = AVAILABLE_YEARS.includes(queryYear as (typeof AVAILABLE_YEARS)[number])
        ? queryYear
        : CURRENT_YEAR;
    const sports = await getData(selectedYear);

    return (
        <div className="space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold gradient-text">점수 관리</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedYear}년 기준 종목별 점수 데이터를 시/도별로 입력하고 관리합니다.
                    </p>
                </div>
            </div>

            <ScoresGridClient sports={sports} selectedYear={selectedYear} />
        </div>
    );
}
