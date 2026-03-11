import { CURRENT_YEAR } from "@/lib/constants";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getDashboardDataset, getScoresForYear } from "@/lib/dashboard-data";

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : CURRENT_YEAR;

  const { scores: allScores, regions, sports, sportEvents } = await getDashboardDataset();
  const scores = getScoresForYear(allScores, year);

  return (
    <DashboardClient
      scores={scores}
      regions={regions}
      sports={sports}
      sportEvents={sportEvents}
    />
  );
}
