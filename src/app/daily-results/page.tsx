import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES, CURRENT_YEAR } from "@/lib/constants";
import { Sport, Region, SportEvent } from "@/types";
import { parseScore, filterScoresByYear } from "@/lib/parse-scores";
import { DailyResultsClient } from "@/components/daily-results/DailyResultsClient";

export const dynamic = 'force-dynamic';

export default async function DailyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const [scoresData, sportsData, regionsData, sportEventsData] = await Promise.all([
    getSheetData(SHEET_NAMES.SCORES),
    getSheetData(SHEET_NAMES.SPORTS),
    getSheetData(SHEET_NAMES.REGIONS),
    getSheetData(SHEET_NAMES.SPORT_EVENTS),
  ]);

  type SheetRow = Record<string, unknown>;

  // Parse scores and filter by year
  const allScores = scoresData.map((row: SheetRow) => parseScore(row));
  const explicitYear = params.year ? Number(params.year) : NaN;
  const yearsWithDate = Array.from(
    new Set(
      allScores
        .filter((s) => !!s.match_date)
        .map((s) => Number(s.year))
        .filter((y) => Number.isFinite(y))
    )
  );
  const fallbackYear =
    yearsWithDate.includes(CURRENT_YEAR)
      ? CURRENT_YEAR
      : yearsWithDate.length > 0
        ? Math.max(...yearsWithDate)
        : CURRENT_YEAR;
  const year = Number.isFinite(explicitYear) ? explicitYear : fallbackYear;
  const scores = filterScoresByYear(allScores, year);

  // Parse sports
  const sports: Sport[] = sportsData.map((row: SheetRow) => ({
    id: String(row.id),
    name: String(row.name),
    sub_name: row.sub_name ? String(row.sub_name) : undefined,
    max_score: Number(row.max_score) || 0,
    category: row.category ? String(row.category) : undefined,
  }));

  // Parse regions
  const regions: Region[] = regionsData.map((row: SheetRow) => ({
    id: String(row.id),
    name: String(row.name),
    is_host: String(row.is_host).toLowerCase() === 'true',
    color: String(row.color),
  }));

  // Parse sport events
  const sportEvents: SportEvent[] = sportEventsData.map((row: SheetRow) => ({
    id: String(row.id),
    sport_id: String(row.sport_id),
    division: String(row.division) as SportEvent['division'],
    event_name: String(row.event_name),
    max_score: row.max_score ? Number(row.max_score) : undefined,
  }));

  return (
    <DailyResultsClient
      scores={scores}
      sports={sports}
      regions={regions}
      sportEvents={sportEvents}
    />
  );
}
