import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";
import { CreateSportDialog } from "@/components/admin/CreateSportDialog";
import { Sport, SportEvent } from "@/types";
import { SportsGridClient } from "./SportsGridClient";

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

export default async function AdminSportsPage() {
    const sports = await getData();

    return (
        <div className="space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold gradient-text">종목 관리</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        종목을 선택하여 확정점수, 순위별 점수, 신기록 가산을 설정합니다.
                    </p>
                </div>
                <CreateSportDialog />
            </div>

            <SportsGridClient sports={sports} />
        </div>
    );
}
