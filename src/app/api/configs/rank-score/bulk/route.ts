import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';

// POST: Bulk add rank score configs (Admin only)
export async function POST(request: Request) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();
        const { sport_event_id, scores } = body;

        if (!sport_event_id || !Array.isArray(scores) || scores.length === 0) {
            return NextResponse.json(
                { error: '세부종목 ID와 점수 배열이 필요합니다' },
                { status: 400 }
            );
        }

        // Validate scores structure
        for (const score of scores) {
            if (typeof score.rank !== 'string' ||
                typeof score.rank_label !== 'string' ||
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
        const configsToDelete = existingConfigs
            .map((config, index) => ({ config, index }))
            .filter(({ config }) => String(config.sport_event_id) === sport_event_id)
            .reverse(); // Delete in reverse order to maintain indices

        // Delete existing configs one by one
        const { deleteSheetRow } = await import('@/lib/google-sheets');
        for (const { index } of configsToDelete) {
            await deleteSheetRow(SHEET_NAMES.RANK_SCORE_CONFIGS, index);
        }

        const now = new Date().toISOString().split('T')[0];

        // Prepare rows for bulk insert
        const newRows = scores.map(score => [
            crypto.randomUUID(),
            sport_event_id,
            score.rank,
            score.rank_label,
            score.acquired_score,
            score.medal_score,
            now,
        ]);

        // Append all rows at once
        await appendSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS, newRows);

        const wasUpdate = configsToDelete.length > 0;
        return NextResponse.json(
            {
                message: wasUpdate
                    ? `${scores.length}개의 순위별 점수 설정이 업데이트되었습니다`
                    : `${scores.length}개의 순위별 점수 설정이 등록되었습니다`,
                count: scores.length
            },
            { status: wasUpdate ? 200 : 201 }
        );
    } catch (error) {
        console.error('Failed to bulk create rank score configs:', error);
        return NextResponse.json({ error: 'Failed to bulk create rank score configs' }, { status: 500 });
    }
}
