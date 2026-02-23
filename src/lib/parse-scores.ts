import { Score } from "@/types";
import { DEFAULT_YEAR } from "@/lib/constants";

/**
 * Parse a raw Google Sheets row into a typed Score object.
 * Handles all 27 columns (A~AA) including year and match_date.
 */
export function parseScore(row: any): Score {
    return {
        id: String(row.id),
        sport_id: String(row.sport_id),
        sport_event_id: row.sport_event_id ? String(row.sport_event_id) : undefined,
        region_id: String(row.region_id),
        division: String(row.division) as Score["division"],
        expected_rank: row.expected_rank ? String(row.expected_rank) : undefined,
        expected_score: row.expected_score != null && row.expected_score !== "" ? Number(row.expected_score) : 0,
        expected_medal_score: row.expected_medal_score != null && row.expected_medal_score !== "" ? Number(row.expected_medal_score) : undefined,
        actual_score: row.actual_score != null && row.actual_score !== "" ? Number(row.actual_score) : undefined,
        actual_medal_score: row.actual_medal_score != null && row.actual_medal_score !== "" ? Number(row.actual_medal_score) : undefined,
        sub_event_total: row.sub_event_total != null && row.sub_event_total !== "" ? Number(row.sub_event_total) : undefined,
        converted_score: row.converted_score != null && row.converted_score !== "" ? Number(row.converted_score) : undefined,
        confirmed_bonus: row.confirmed_bonus != null && row.confirmed_bonus !== "" ? Number(row.confirmed_bonus) : undefined,
        record_type: row.record_type ? String(row.record_type) : undefined,
        total_score: row.total_score != null && row.total_score !== "" ? Number(row.total_score) : undefined,
        gold: row.gold != null && row.gold !== "" ? Number(row.gold) : undefined,
        silver: row.silver != null && row.silver !== "" ? Number(row.silver) : undefined,
        bronze: row.bronze != null && row.bronze !== "" ? Number(row.bronze) : undefined,
        rank: row.rank ? String(row.rank) : undefined,
        updated_at: row.updated_at ? String(row.updated_at) : undefined,
        expected_sub_event_total: row.expected_sub_event_total != null && row.expected_sub_event_total !== "" ? Number(row.expected_sub_event_total) : undefined,
        expected_record_type: row.expected_record_type ? String(row.expected_record_type) : undefined,
        expected_confirmed_bonus: row.expected_confirmed_bonus != null && row.expected_confirmed_bonus !== "" ? Number(row.expected_confirmed_bonus) : undefined,
        expected_total_score: row.expected_total_score != null && row.expected_total_score !== "" ? Number(row.expected_total_score) : undefined,
        expected_converted_score: row.expected_converted_score != null && row.expected_converted_score !== "" ? Number(row.expected_converted_score) : undefined,
        year: row.year != null && row.year !== "" ? Number(row.year) : DEFAULT_YEAR,
        match_date: row.match_date ? String(row.match_date) : undefined,
    };
}

/**
 * Filter scores array by year.
 */
export function filterScoresByYear(scores: Score[], year: number): Score[] {
    return scores.filter((s) => s.year === year);
}

/**
 * Convert a Score object to a row array for Google Sheets (27 columns, A~AA).
 */
export function scoreToRow(score: Score): (string | number)[] {
    return [
        score.id,
        score.sport_id,
        score.sport_event_id ?? "",
        score.region_id,
        score.division,
        score.expected_rank ?? "",
        score.expected_score ?? 0,
        score.expected_medal_score ?? "",
        score.actual_score ?? "",
        score.actual_medal_score ?? "",
        score.sub_event_total ?? "",
        score.converted_score ?? "",
        score.confirmed_bonus ?? "",
        score.record_type ?? "",
        score.total_score ?? "",
        score.gold ?? "",
        score.silver ?? "",
        score.bronze ?? "",
        score.rank ?? "",
        score.updated_at ?? "",
        score.expected_sub_event_total ?? "",
        score.expected_record_type ?? "",
        score.expected_confirmed_bonus ?? "",
        score.expected_total_score ?? "",
        score.expected_converted_score ?? "",
        score.year ?? DEFAULT_YEAR,
        score.match_date ?? "",
    ];
}
