import { SHEET_NAMES, CURRENT_YEAR } from "@/lib/constants";
import { DailyResultsClient } from "@/components/daily-results/DailyResultsClient";
import { getAvailableScoreYears, getDashboardDataset, getScoresForYear, resolveYear } from "@/lib/dashboard-data";

export const dynamic = 'force-dynamic';

export default async function DailyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const { scores: allScores, sports, regions, sportEvents } = await getDashboardDataset();
  const explicitYear = params.year ? Number(params.year) : NaN;
  const yearsWithDate = getAvailableScoreYears(allScores, (score) => !!score.match_date);
  const year = resolveYear(explicitYear, yearsWithDate, CURRENT_YEAR);
  const scores = getScoresForYear(allScores, year);

  return (
    <DailyResultsClient
      scores={scores}
      sports={sports}
      regions={regions}
      sportEvents={sportEvents}
    />
  );
}
