import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";
import { CURRENT_YEAR } from "@/lib/constants";
import { Region, Sport, SportEvent } from "@/types";
import { parseScore, filterScoresByYear } from "@/lib/parse-scores";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : CURRENT_YEAR;

  // Fetch necessary data
  const [scoresData, regionsData, sportsData, sportEventsData] = await Promise.all([
    getSheetData(SHEET_NAMES.SCORES),
    getSheetData(SHEET_NAMES.REGIONS),
    getSheetData(SHEET_NAMES.SPORTS),
    getSheetData(SHEET_NAMES.SPORT_EVENTS),
  ]);

  // Parse scores and filter by year
  const allScores = scoresData.map((row: any) => parseScore(row));
  const scores = filterScoresByYear(allScores, year);

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
