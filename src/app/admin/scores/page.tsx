import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";
import { Sport, SportEvent } from "@/types";
import { ScoresGridClient } from "./ScoresGridClient";

export const dynamic = 'force-dynamic';

interface SportWithStats extends Sport {
    eventCount: number;
    divisionCount: number;
}

async function getData(): Promise<SportWithStats[]> {
    const [sportsData, eventsData] = await Promise.all([
        getSheetData(SHEET_NAMES.SPORTS),
        getSheetData(SHEET_NAMES.SPORT_EVENTS).catch(() => []),
    ]);

    const events: SportEvent[] = eventsData.map((row) => ({
        id: String(row.id),
        sport_id: String(row.sport_id),
        division: String(row.division) as SportEvent['division'],
        event_name: String(row.event_name),
        max_score: row.max_score ? Number(row.max_score) : undefined,
    }));

    // Group events by sport_id and calculate counts
    const eventsBySport = events.reduce((acc, event) => {
        if (!acc[event.sport_id]) {
            acc[event.sport_id] = [];
        }
        acc[event.sport_id].push(event);
        return acc;
    }, {} as Record<string, SportEvent[]>);

    const sports: SportWithStats[] = sportsData.map((row) => {
        const sportId = String(row.id);
        const sportEvents = eventsBySport[sportId] || [];

        // Count unique divisions
        const uniqueDivisions = new Set(sportEvents.map(e => e.division));

        return {
            id: sportId,
            name: String(row.name),
            sub_name: row.sub_name ? String(row.sub_name) : undefined,
            max_score: Number(row.max_score),
            category: String(row.category) as '구기' | '무도' | '기타',
            eventCount: sportEvents.length,
            divisionCount: uniqueDivisions.size,
        };
    });

    return sports;
}

export default async function AdminScoresPage() {
    const sports = await getData();

    return (
        <div className="space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold gradient-text">점수 관리</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        종목별 점수 데이터를 시/도별로 입력하고 관리합니다.
                    </p>
                </div>
            </div>

            <ScoresGridClient sports={sports} />
        </div>
    );
}
