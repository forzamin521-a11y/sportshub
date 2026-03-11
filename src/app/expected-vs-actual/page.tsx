import { CURRENT_YEAR } from "@/lib/constants";
import { ExpectedVsActualClient } from "@/components/expected-vs-actual/ExpectedVsActualClient";
import { getAvailableScoreYears, getDashboardDataset, getScoresForYear, resolveYear } from "@/lib/dashboard-data";

export const dynamic = 'force-dynamic';

export default async function ExpectedVsActualPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const { scores: allScores, sports, regions, sportEvents } = await getDashboardDataset();
  const explicitYear = params.year ? Number(params.year) : NaN;
  const yearsWithData = getAvailableScoreYears(allScores);
  const year = resolveYear(explicitYear, yearsWithData, CURRENT_YEAR);
  const scores = getScoresForYear(allScores, year);

  return (
    <ExpectedVsActualClient
      scores={scores}
      sports={sports}
      regions={regions}
      sportEvents={sportEvents}
    />
  );
}
