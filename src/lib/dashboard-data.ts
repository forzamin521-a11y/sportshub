import { getSheetData } from "@/lib/google-sheets";
import { CURRENT_YEAR, SHEET_NAMES } from "@/lib/constants";
import { Score } from "@/types";
import { filterScoresByYear } from "@/lib/parse-scores";
import { parseRegions, parseScores, parseSportEvents, parseSports } from "@/lib/sheet-parsers";

export async function getDashboardDataset() {
  const [scoresData, regionsData, sportsData, sportEventsData] = await Promise.all([
    getSheetData(SHEET_NAMES.SCORES),
    getSheetData(SHEET_NAMES.REGIONS),
    getSheetData(SHEET_NAMES.SPORTS),
    getSheetData(SHEET_NAMES.SPORT_EVENTS),
  ]);

  return {
    scores: parseScores(scoresData),
    regions: parseRegions(regionsData),
    sports: parseSports(sportsData),
    sportEvents: parseSportEvents(sportEventsData),
  };
}

export function resolveYear(
  explicitYear: number,
  availableYears: number[],
  fallbackYear = CURRENT_YEAR
) {
  return Number.isFinite(explicitYear)
    ? explicitYear
    : availableYears.includes(fallbackYear)
      ? fallbackYear
      : availableYears.length > 0
        ? Math.max(...availableYears)
        : fallbackYear;
}

export function getAvailableScoreYears(
  scores: Score[],
  predicate?: (score: Score) => boolean
) {
  return Array.from(
    new Set(
      scores
        .filter((score) => (predicate ? predicate(score) : true))
        .map((score) => Number(score.year))
        .filter((year) => Number.isFinite(year))
    )
  );
}

export function getScoresForYear(scores: Score[], year: number) {
  return filterScoresByYear(scores, year);
}
