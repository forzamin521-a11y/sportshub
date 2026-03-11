import { RecordType } from "@/lib/record-types";
import { Score } from "@/types";

export type ScoreTotalField = "sub_event_total" | "expected_sub_event_total";

export function createRecordTypeMap(recordTypes: RecordType[]) {
  return new Map(recordTypes.map((recordType) => [recordType.id, recordType]));
}

export function calculateAlphaScoreFromTotals(maxScore: number, totals: Iterable<number>) {
  const total = Array.from(totals).reduce((sum, value) => sum + value, 0);
  return {
    alphaScore: total > 0 ? maxScore / total : 0,
    totalNationalScore: total,
  };
}

export function getUniqueEventTotals(
  scores: Score[],
  totalField: ScoreTotalField
) {
  const totals = new Map<string, number>();

  scores.forEach((score) => {
    const eventId = score.sport_event_id;
    const total = score[totalField];
    if (eventId && typeof total === "number" && total > 0) {
      totals.set(eventId, total);
    }
  });

  return totals;
}

export function calculateConvertedScore(
  acquiredScore: number,
  medalScore: number,
  alphaScore: number
) {
  return acquiredScore * alphaScore + medalScore;
}

export function calculateRecordBonus(
  acquiredScore: number,
  recordTypeId: string | undefined,
  recordTypes: Map<string, RecordType>
) {
  if (!recordTypeId || recordTypeId === "none") return 0;
  const recordType = recordTypes.get(recordTypeId);
  return recordType && recordType.bonus_percentage > 0
    ? acquiredScore * (recordType.bonus_percentage / 100)
    : 0;
}

export function calculateConvertedTotal(
  acquiredScore: number,
  medalScore: number,
  alphaScore: number,
  recordTypeId: string | undefined,
  recordTypes: Map<string, RecordType>
) {
  const convertedScore = calculateConvertedScore(acquiredScore, medalScore, alphaScore);
  const confirmedBonus = calculateRecordBonus(acquiredScore, recordTypeId, recordTypes);

  return {
    convertedScore,
    confirmedBonus,
    totalScore: convertedScore + confirmedBonus,
  };
}
