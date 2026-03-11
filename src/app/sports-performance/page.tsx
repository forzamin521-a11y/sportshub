import { GYEONGGI_REGION_ID, CURRENT_YEAR } from "@/lib/constants";
import { SportsPerformanceClient } from "@/components/sports-performance/SportsPerformanceClient";
import { getDashboardDataset, getScoresForYear } from "@/lib/dashboard-data";

export const dynamic = 'force-dynamic';

export default async function SportsPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : CURRENT_YEAR;
  const { scores: allScores, sports, sportEvents } = await getDashboardDataset();
  const scores = getScoresForYear(
    allScores.filter((score) => score.region_id === GYEONGGI_REGION_ID),
    year
  );

  return <SportsPerformanceClient scores={scores} sports={sports} sportEvents={sportEvents} />;
}
