import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES, GYEONGGI_REGION_ID } from "@/lib/constants";
import { Score, Region, Sport, SportEvent } from "@/types";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch necessary data
  const [scoresData, regionsData, sportsData, sportEventsData] = await Promise.all([
    getSheetData(SHEET_NAMES.SCORES),
    getSheetData(SHEET_NAMES.REGIONS),
    getSheetData(SHEET_NAMES.SPORTS),
    getSheetData(SHEET_NAMES.SPORT_EVENTS),
  ]);

  // Parse scores (only Gyeonggi for stats, all for ranking)
  const scores: Score[] = scoresData.map((row: any) => ({
    id: String(row.id),
    sport_id: String(row.sport_id),
    sport_event_id: row.sport_event_id ? String(row.sport_event_id) : undefined,
    region_id: String(row.region_id),
    division: String(row.division) as Score['division'],
    expected_score: Number(row.expected_score) || 0,
    actual_score: Number(row.actual_score) || 0,
    actual_medal_score: Number(row.actual_medal_score) || 0,
    converted_score: Number(row.converted_score) || 0,
    confirmed_bonus: Number(row.confirmed_bonus) || 0,
    total_score: Number(row.total_score) || 0,
    gold: Number(row.gold) || 0,
    silver: Number(row.silver) || 0,
    bronze: Number(row.bronze) || 0,
    rank: row.rank ? String(row.rank) : undefined,
  }));

  // Parse regions
  const regions: Region[] = regionsData.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    is_host: String(row.is_host).toLowerCase() === 'true',
    color: String(row.color),
  }));

  // Parse sports
  const sports: Sport[] = sportsData.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    sub_name: row.sub_name ? String(row.sub_name) : undefined,
    max_score: Number(row.max_score) || 0,
    category: row.category ? String(row.category) : undefined,
  }));

  // Parse sport events
  const sportEvents: SportEvent[] = sportEventsData.map((row: any) => ({
    id: String(row.id),
    sport_id: String(row.sport_id),
    division: String(row.division) as SportEvent['division'],
    event_name: String(row.event_name),
    max_score: row.max_score ? Number(row.max_score) : undefined,
  }));

  return (
    <DashboardClient
      scores={scores}
      regions={regions}
      sports={sports}
      sportEvents={sportEvents}
    />
  );
}
