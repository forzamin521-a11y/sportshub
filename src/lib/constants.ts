export const SHEET_NAMES = {
    CONFIG: 'config',
    REGIONS: 'regions',
    SPORTS: 'sports',
    SCORES: 'scores',
    CATEGORY_SCORES: 'category_scores',
    SPORT_EVENTS: 'sport_events',        // 세부종목 데이터
    RECORD_BONUS_CONFIGS: 'record_bonus', // 신기록 가산 설정
    RANK_SCORE_CONFIGS: 'rank_score',     // 순위별 점수 설정
    RECORD_TYPES: 'record_types',         // 신기록 타입 정의
};

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

export const DEFAULT_PAGE_SIZE = 20;

export const REGIONS = {
    GG: '경기도',
    BS: '부산',
    SE: '서울',
    GB: '경북',
};

export const SPORT_CATEGORIES = ['구기', '무도', '기타'];

// 종별 (Division) - 전체 9개
export const DIVISIONS = {
    MHS: '남고',    // Male High School
    FHS: '여고',    // Female High School
    HS: '고등',     // High School (general)
    MU: '남대',     // Male University
    FU: '여대',     // Female University
    U: '대학',      // University (general)
    MG: '남일',     // Male General
    FG: '여일',     // Female General
    G: '일반',      // General
} as const;

export const DIVISION_LIST = ['남고', '여고', '고등', '남대', '여대', '대학', '남일', '여일', '일반'] as const;
export type Division = typeof DIVISION_LIST[number];

// 경기도 담당자 모드 - 경기도 전용 설정
export const GYEONGGI_REGION_ID = 'GG';
export const GYEONGGI_REGION_NAME = '경기도';

// 육상 트랙 세부종목 기본 데이터
export const TRACK_EVENTS = {
    MHS: ['100m', '200m', '400m', '800m', '1500m', '5000m', '10000m', '110mH', '400mH', '3000mSC', '4x100mR', '4x400mR'],
    FHS: ['100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', '100mH', '400mH', '4x100mR', '4x400mR'],
    HS: ['10000mW'],
    MU: ['100m', '200m', '400m', '800m', '1500m', '5000m', '10000m', '110mH', '400mH', '3000mSC', '4x100mR', '4x400mR'],
    FU: ['100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', '100mH', '400mH', '4x100mR', '4x400mR'],
    U: ['10000mW'],
    MG: ['100m', '200m', '400m', '800m', '1500m', '5000m', '10000m', '110mH', '400mH', '3000mSC', '4x100mR', '4x400mR'],
    FG: ['100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', '100mH', '400mH', '4x100mR', '4x400mR'],
    G: ['10000mW', '20000mW'],
} as const;

// 육상 필드 세부종목 기본 데이터
export const FIELD_EVENTS = {
    MHS: ['높이뛰기', '장대높이뛰기', '멀리뛰기', '세단뛰기', '포환던지기', '원반던지기', '해머던지기', '창던지기'],
    FHS: ['높이뛰기', '장대높이뛰기', '멀리뛰기', '세단뛰기', '포환던지기', '원반던지기', '해머던지기', '창던지기'],
    MU: ['높이뛰기', '장대높이뛰기', '멀리뛰기', '세단뛰기', '포환던지기', '원반던지기', '해머던지기', '창던지기', '10종경기'],
    FU: ['높이뛰기', '장대높이뛰기', '멀리뛰기', '세단뛰기', '포환던지기', '원반던지기', '해머던지기', '창던지기', '7종경기'],
    MG: ['높이뛰기', '장대높이뛰기', '멀리뛰기', '세단뛰기', '포환던지기', '원반던지기', '해머던지기', '창던지기', '10종경기'],
    FG: ['높이뛰기', '장대높이뛰기', '멀리뛰기', '세단뛰기', '포환던지기', '원반던지기', '해머던지기', '창던지기', '7종경기'],
} as const;

// 종별 코드 매핑
export const DIVISION_CODE_MAP = {
    '남고': 'MHS',
    '여고': 'FHS',
    '고등': 'HS',
    '남대': 'MU',
    '여대': 'FU',
    '대학': 'U',
    '남일': 'MG',
    '여일': 'FG',
    '일반': 'G',
} as const;
