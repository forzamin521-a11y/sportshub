export interface Region {
  id: string; // GG, BS, SE, GB
  name: string; // 경기도, 부산, 서울, 경북
  is_host: boolean;
  color: string; // HEX code
}

export interface Sport {
  id: string;
  name: string;
  sub_name?: string;
  max_score: number;
  category?: string; // Optional - not used in new schema
}

export interface Score {
  id: string; // UUID
  sport_id: string;
  sport_event_id?: string; // 세부종목 ID (track-남고-100m 등)
  region_id: string;
  division: '남고' | '여고' | '고등' | '남대' | '여대' | '대학' | '남일' | '여일' | '일반'; // 종별
  expected_rank?: string; // 예상 순위/라운드 (1, 2, 3 또는 round_of_4, round_of_8 등)
  expected_score: number; // 예상 득점
  expected_medal_score?: number; // 예상 메달득점
  actual_score?: number; // 실제 득점 (획득성적)
  actual_medal_score?: number; // 실제 메달득점
  sub_event_total?: number; // 해당 세부종목의 전체점수합계 (전국 17개 시도의 획득성적 합)
  converted_score?: number; // 환산점수 = (획득성적 × 알점수) + 메달득점
  confirmed_bonus?: number; // 확정자가산 (자동계산: 실제득점 × 신기록가산배율)
  record_type?: string; // 신기록 타입 (해당없음, 세계신기록, 한국신기록 등)
  total_score?: number; // 총 득점
  gold?: number; // 금메달
  silver?: number; // 은메달
  bronze?: number; // 동메달
  rank?: string; // 실제 순위/라운드 (1, 2, 3 또는 round_of_4, round_of_8 등)
  updated_at?: string;
  // 예상 관련 필드 (U-Y 컬럼)
  expected_sub_event_total?: number; // 예상 전국점수합계
  expected_record_type?: string; // 예상 신기록 타입
  expected_confirmed_bonus?: number; // 예상 확정자가산 (자동계산)
  expected_total_score?: number; // 예상 총점 (자동계산)
  expected_converted_score?: number; // 예상 환산점수 (배치 계산)
  // 연도별 데이터 관리
  year: number; // 대회 연도 (기본값 2025)
  match_date?: string; // 경기일자 (YYYY-MM-DD)
}

export interface CategoryScore {
  id: string; // UUID
  sport_id: string;
  category: '남고' | '여고' | '남대' | '여대' | '남일' | '여일' | '일반' | string;
  converted_score: number;
  category_score: number;
  medal_score: number;
  updated_at?: string;
}

export interface Config {
  key: string;
  value: string;
  updated_at?: string;
}

// Division type
export type Division = '남고' | '여고' | '고등' | '남대' | '여대' | '대학' | '남일' | '여일' | '일반';

// 세부종목 - 종목 > 종별 > 세부종목 구조
export interface SportEvent {
  id: string;              // 'track-mhs-100m'
  sport_id: string;        // 'track'
  division: Division;      // '남고'
  event_name: string;      // '100m'
  max_score?: number;      // 세부종목별 점수 (선택)
}

// 신기록 가산 설정 (세부종목별)
export interface RecordBonusConfig {
  id: string;
  sport_event_id: string;   // 세부종목 ID (track-남고-100m 등)
  bonus_multiplier: number; // 가산 배수 (예: 1.5)
  updated_at?: string;
}

// 순위별 점수 설정 (1위, 2위, 3위 등) - 세부종목별로 설정
export interface RankScoreConfig {
  id: string;
  sport_event_id: string;    // 세부종목 ID (track-남고-100m 등)
  rank: string;              // 순위/라운드 (1, 2, 3, ... 또는 round_of_4, round_of_8, round_of_16)
  rank_label: string;        // UI 표시용 (1위, 2위, 4강, 8강, 16강 등)
  acquired_score: number;    // 획득성적 점수
  medal_score: number;       // 메달점수
  updated_at?: string;
}

// API Response Wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
