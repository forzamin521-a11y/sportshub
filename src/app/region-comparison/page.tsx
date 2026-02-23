import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES, CURRENT_YEAR } from "@/lib/constants";
import { Sport, Region } from "@/types";
import { parseScore, filterScoresByYear } from "@/lib/parse-scores";
import { RegionComparisonClient } from "@/components/region-comparison/RegionComparisonClient";

export const dynamic = 'force-dynamic';

export default async function RegionComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : CURRENT_YEAR;

  // Fetch all data for comparison
  const [scoresData, sportsData, regionsData] = await Promise.all([
    getSheetData(SHEET_NAMES.SCORES),
    getSheetData(SHEET_NAMES.SPORTS),
    getSheetData(SHEET_NAMES.REGIONS),
  ]);

  // Parse scores and filter by year
  const allScores = scoresData.map((row: any) => parseScore(row));
  const scores = filterScoresByYear(allScores, year);

  // Parse sports
  const sports: Sport[] = sportsData.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    sub_name: row.sub_name ? String(row.sub_name) : undefined,
    max_score: Number(row.max_score) || 0,
    category: row.category ? String(row.category) : undefined,
  }));

  // Parse regions
  const regions: Region[] = regionsData.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    is_host: String(row.is_host).toLowerCase() === 'true',
    color: String(row.color),
  }));

  return (
    <RegionComparisonClient
      scores={scores}
      sports={sports}
      regions={regions}
    />
  );
}
