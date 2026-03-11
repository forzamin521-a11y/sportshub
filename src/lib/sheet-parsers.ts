import { Region, Score, Sport, SportEvent } from "@/types";
import { parseScore } from "@/lib/parse-scores";

export type RawSheetRow = Record<string, unknown>;

export function parseRegion(row: RawSheetRow): Region {
  return {
    id: String(row.id),
    name: String(row.name),
    is_host: String(row.is_host).toLowerCase() === "true",
    color: String(row.color),
  };
}

export function parseSport(row: RawSheetRow): Sport {
  return {
    id: String(row.id),
    name: String(row.name),
    sub_name: row.sub_name ? String(row.sub_name) : undefined,
    max_score: Number(row.max_score) || 0,
    category: row.category ? String(row.category) : undefined,
  };
}

export function parseSportEvent(row: RawSheetRow): SportEvent {
  return {
    id: String(row.id),
    sport_id: String(row.sport_id),
    division: String(row.division) as SportEvent["division"],
    event_name: String(row.event_name),
    max_score: row.max_score ? Number(row.max_score) : undefined,
  };
}

export function parseRegions(rows: RawSheetRow[]): Region[] {
  return rows.map(parseRegion);
}

export function parseSports(rows: RawSheetRow[]): Sport[] {
  return rows.map(parseSport);
}

export function parseSportEvents(rows: RawSheetRow[]): SportEvent[] {
  return rows.map(parseSportEvent);
}

export function parseScores(rows: RawSheetRow[]): Score[] {
  return rows.map(parseScore);
}
