import { z } from "zod";

export const scoreSchema = z.object({
    sport_id: z.string().min(1, "종목을 선택하세요"),
    region_id: z.string().min(1, "시도를 선택하세요"),
    division: z.enum(["남고", "여고", "고등", "남대", "여대", "대학", "남일", "여일", "일반"], {
        message: "종별을 선택하세요"
    }),
    expected_rank: z.string().optional(),
    expected_score: z.number().min(0, "0 이상 입력"),
    expected_medal_score: z.number().min(0).optional(),
    actual_score: z.number().min(0).optional(),
    actual_medal_score: z.number().min(0).optional(),
    sub_event_total: z.number().min(0).optional(),
    converted_score: z.number().min(0).optional(),
    confirmed_bonus: z.number().min(0).optional(),
    record_type: z.string().optional(),
    total_score: z.number().min(0).optional(),
    gold: z.number().int().min(0).optional(),
    silver: z.number().int().min(0).optional(),
    bronze: z.number().int().min(0).optional(),
    rank: z.string().optional(),
    expected_sub_event_total: z.number().min(0).optional(),
    expected_record_type: z.string().optional(),
    expected_confirmed_bonus: z.number().min(0).optional(),
    expected_total_score: z.number().min(0).optional(),
    expected_converted_score: z.number().min(0).optional(),
    year: z.number().int().min(2020).max(2030).optional(),
    match_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다").optional(),
});

export const sportSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "종목명을 입력하세요"),
    sub_name: z.string().optional(),
    max_score: z.number().min(0, "확정점수는 0 이상이어야 합니다"),
    category: z.string().optional(), // Optional field
});

export const regionSchema = z.object({
    id: z.string().min(2, "시도 코드는 2자리 이상이어야 합니다"), // e.g., GG
    name: z.string().min(1, "시도명을 입력하세요"),
    is_host: z.boolean(),
    color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "유효한 HEX 색상 코드를 입력하세요"),
});

export const sportEventSchema = z.object({
    id: z.string().optional(),
    sport_id: z.string().min(1, "종목을 선택하세요"),
    division: z.enum(["남고", "여고", "고등", "남대", "여대", "대학", "남일", "여일", "일반"]),
    event_name: z.string().min(1, "세부종목명을 입력하세요"),
    max_score: z.number().min(0).optional(),
});

export const recordBonusConfigSchema = z.object({
    id: z.string().optional(),
    sport_event_id: z.string().min(1, "세부종목을 선택하세요"),
    bonus_multiplier: z.number().min(1, "가산 배수는 1 이상이어야 합니다").max(10, "가산 배수는 10 이하여야 합니다"),
});

export const rankScoreConfigSchema = z.object({
    id: z.string().optional(),
    sport_event_id: z.string().min(1, "세부종목을 선택하세요"),
    rank: z.string().min(1, "순위/라운드를 입력하세요"),
    rank_label: z.string().min(1, "순위 라벨을 입력하세요"),
    acquired_score: z.number().min(0, "획득성적은 0 이상이어야 합니다"),
    medal_score: z.number().min(0, "메달점수는 0 이상이어야 합니다"),
});
