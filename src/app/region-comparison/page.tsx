import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";
import { Sport, Score, Region } from "@/types";
import { RegionComparisonClient } from "@/components/region-comparison/RegionComparisonClient";

export const dynamic = 'force-dynamic';

export default async function RegionComparisonPage() {
  // Fetch all data for comparison
  const [scoresData, sportsData, regionsData] = await Promise.all([
    getSheetData(SHEET_NAMES.SCORES),
    getSheetData(SHEET_NAMES.SPORTS),
    getSheetData(SHEET_NAMES.REGIONS),
  ]);

  // Parse scores
  const scores: Score[] = scoresData.map((row: any) => ({
    id: String(row.id),
    sport_id: String(row.sport_id),
    sport_event_id: row.sport_event_id ? String(row.sport_event_id) : undefined,
    region_id: String(row.region_id),
    division: String(row.division) as Score['division'],
    expected_score: row.expected_score != null && row.expected_score !== '' ? Number(row.expected_score) : 0,
    actual_score: row.actual_score != null && row.actual_score !== '' ? Number(row.actual_score) : 0,
    actual_medal_score: row.actual_medal_score != null && row.actual_medal_score !== '' ? Number(row.actual_medal_score) : 0,
    converted_score: row.converted_score != null && row.converted_score !== '' ? Number(row.converted_score) : 0,
    total_score: row.total_score != null && row.total_score !== '' ? Number(row.total_score) : 0,
    gold: row.gold != null && row.gold !== '' ? Number(row.gold) : 0,
    silver: row.silver != null && row.silver !== '' ? Number(row.silver) : 0,
    bronze: row.bronze != null && row.bronze !== '' ? Number(row.bronze) : 0,
    rank: row.rank ? String(row.rank) : undefined,
  }));

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
