// 신기록 타입과 가산 배율
// 예: 50% = 실제득점의 50%를 추가 (총 150%)
export interface RecordType {
    id: string;
    name: string;
    bonus_percentage: number; // 추가 가산 비율 (50% = 0.5배 추가)
}

export const DEFAULT_RECORD_TYPES: RecordType[] = [
    { id: "none", name: "해당없음", bonus_percentage: 0 },
    { id: "world_new", name: "세계신기록", bonus_percentage: 300 },
    { id: "world_tie", name: "세계타이기록", bonus_percentage: 200 },
    { id: "world_junior_new", name: "세계주니어신기록", bonus_percentage: 160 },
    { id: "world_junior_tie", name: "세계주니어타이기록", bonus_percentage: 100 },
    { id: "korea_new", name: "한국신기록", bonus_percentage: 200 },
    { id: "korea_tie", name: "한국타이기록", bonus_percentage: 60 },
    { id: "korea_junior_new", name: "한국주니어신기록", bonus_percentage: 60 },
    { id: "korea_junior_tie", name: "한국주니어타이기록", bonus_percentage: 50 },
    { id: "meet_record", name: "대회신기록(한국학생신기록포함)", bonus_percentage: 50 },
    { id: "personal_best", name: "자기최고기록 갱신", bonus_percentage: 50 },
];

// 신기록 타입 ID로 배율 가져오기
export function getRecordBonusPercentage(recordTypeId: string, customTypes?: RecordType[]): number {
    const types = customTypes || DEFAULT_RECORD_TYPES;
    const recordType = types.find(t => t.id === recordTypeId);
    return recordType?.bonus_percentage || 0;
}

// 확정자가산 계산: 실제득점 × (가산배율 / 100)
export function calculateConfirmedBonus(actualScore: number, recordTypeId: string, customTypes?: RecordType[]): number {
    if (!recordTypeId || recordTypeId === "none") return 0;
    const bonusPercentage = getRecordBonusPercentage(recordTypeId, customTypes);
    return actualScore * (bonusPercentage / 100);
}
