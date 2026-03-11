import { CURRENT_YEAR } from "@/lib/constants";
import { RegionComparisonClient } from "@/components/region-comparison/RegionComparisonClient";
import { getDashboardDataset, getScoresForYear } from "@/lib/dashboard-data";

export const dynamic = 'force-dynamic';

export default async function RegionComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : CURRENT_YEAR;
  const { scores: allScores, sports, regions } = await getDashboardDataset();
  const scores = getScoresForYear(allScores, year);

  return (
    <RegionComparisonClient
      scores={scores}
      sports={sports}
      regions={regions}
    />
  );
}
