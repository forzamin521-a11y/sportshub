import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData, deleteSheetRows } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { formatRankLabel } from '@/lib/rank-utils';

function isQuotaError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return message.includes('quota') || message.includes('rate limit') || message.includes('한도') || message.includes('429');
}

const rankBulkLocks = (globalThis as typeof globalThis & {
    __rankBulkLocks?: Set<string>;
}).__rankBulkLocks || new Set<string>();

(globalThis as typeof globalThis & { __rankBulkLocks?: Set<string> }).__rankBulkLocks = rankBulkLocks;

// POST: Bulk add rank score configs (Admin only)
export async function POST(request: Request) {
    let lockKeys: string[] = [];
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = (await request.json()) as {
            sport_event_ids?: unknown[];
            sport_event_id?: unknown;
            scores?: Array<{
                rank: string | number;
                rank_label?: string;
                acquired_score: number;
                medal_score: number;
            }>;
        };
        const rawEventIds: unknown[] = Array.isArray(body?.sport_event_ids)
            ? body.sport_event_ids
            : body?.sport_event_id
                ? [body.sport_event_id]
                : [];
        const sportEventIds: string[] = Array.from(
            new Set(
                rawEventIds
                    .map((eventId: unknown) => String(eventId || "").trim())
                    .filter(Boolean)
            )
        );
        const { scores } = body;

        if (sportEventIds.length === 0 || !Array.isArray(scores) || scores.length === 0) {
            return NextResponse.json(
                { error: '세부종목 ID 배열과 점수 배열이 필요합니다' },
                { status: 400 }
            );
        }

        const lockedEventId = sportEventIds.find((eventId) => rankBulkLocks.has(eventId));
        if (lockedEventId) {
            return NextResponse.json(
                { error: "해당 세부종목의 순위별 점수 저장이 진행 중입니다. 잠시 후 다시 시도해주세요." },
                { status: 409 }
            );
        }
        sportEventIds.forEach((eventId) => rankBulkLocks.add(eventId));
        lockKeys = sportEventIds;

        // Validate scores structure
        for (const score of scores) {
            if ((typeof score.rank !== 'string' && typeof score.rank !== 'number') ||
                typeof score.acquired_score !== 'number' ||
                typeof score.medal_score !== 'number') {
                return NextResponse.json(
                    { error: '유효하지 않은 점수 데이터입니다' },
                    { status: 400 }
                );
            }
        }

        // Delete existing rank scores for this sport event (to enable updates)
        const existingConfigs = await getSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS);
        const targetEventIdSet = new Set(sportEventIds);
        const configsToDelete = existingConfigs
            .map((config, index) => ({ config, index }))
            .filter(({ config }) => targetEventIdSet.has(String(config.sport_event_id)))
            .reverse(); // Delete in reverse order to maintain indices

        if (configsToDelete.length > 0) {
            await deleteSheetRows(
                SHEET_NAMES.RANK_SCORE_CONFIGS,
                configsToDelete.map(({ index }) => index)
            );
        }

        const now = new Date().toISOString().split('T')[0];

        // Prepare rows for bulk insert
        const newRows = sportEventIds.flatMap((sportEventId) =>
            scores.map(score => [
                crypto.randomUUID(),
                sportEventId,
                String(score.rank),
                score.rank_label || formatRankLabel(String(score.rank)),
                score.acquired_score,
                score.medal_score,
                now,
            ])
        );

        // Append all rows at once
        await appendSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS, newRows);

        const wasUpdate = configsToDelete.length > 0;
        return NextResponse.json(
            {
                message: wasUpdate
                    ? `${sportEventIds.length}개 세부종목의 순위별 점수 설정이 업데이트되었습니다`
                    : `${sportEventIds.length}개 세부종목의 순위별 점수 설정이 등록되었습니다`,
                count: newRows.length,
                event_count: sportEventIds.length,
            },
            { status: wasUpdate ? 200 : 201 }
        );
    } catch (error) {
        console.error('Failed to bulk create rank score configs:', error);
        if (isQuotaError(error)) {
            return NextResponse.json(
                { error: 'Google Sheets API 한도 초과. 1분 후 다시 시도해주세요.' },
                { status: 429 }
            );
        }
        return NextResponse.json({ error: 'Failed to bulk create rank score configs' }, { status: 500 });
    } finally {
        lockKeys.forEach((eventId) => rankBulkLocks.delete(eventId));
    }
}
