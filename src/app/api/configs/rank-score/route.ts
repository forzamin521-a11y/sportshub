import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData, updateSheetData, deleteSheetRow } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { RankScoreConfig } from '@/types';
import { rankScoreConfigSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { formatRankLabel, rankSortValue } from '@/lib/rank-utils';

function isQuotaError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return message.includes('quota') || message.includes('rate limit') || message.includes('한도') || message.includes('429');
}

const rankWriteLocks = (globalThis as typeof globalThis & {
    __rankWriteLocks?: Set<string>;
}).__rankWriteLocks || new Set<string>();

(globalThis as typeof globalThis & { __rankWriteLocks?: Set<string> }).__rankWriteLocks = rankWriteLocks;

// GET: Fetch all rank score configs
export async function GET() {
    try {
        const rawData = await getSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS);

        const configs: RankScoreConfig[] = rawData.map((row) => ({
            id: String(row.id),
            sport_event_id: String(row.sport_event_id),
            rank: String(row.rank),
            rank_label: row.rank_label ? String(row.rank_label) : formatRankLabel(String(row.rank)),
            acquired_score: Number(row.acquired_score),
            medal_score: Number(row.medal_score),
            updated_at: row.updated_at ? String(row.updated_at) : undefined,
        }));

        configs.sort((a, b) => rankSortValue(String(a.rank)) - rankSortValue(String(b.rank)));

        return NextResponse.json({ data: configs });
    } catch (error) {
        console.error('Failed to fetch rank score configs:', error);
        if (isQuotaError(error)) {
            return NextResponse.json(
                { error: 'Google Sheets API 한도 초과. 1분 후 다시 시도해주세요.' },
                { status: 429 }
            );
        }
        return NextResponse.json({ error: 'Failed to fetch rank score configs' }, { status: 500 });
    }
}

// POST: Add a new rank score config (Admin only)
export async function POST(request: Request) {
    let lockKey: string | null = null;
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();
        lockKey = String(body?.sport_event_id || "");
        if (lockKey && rankWriteLocks.has(lockKey)) {
            return NextResponse.json(
                { error: '해당 세부종목의 순위 설정 저장이 진행 중입니다. 잠시 후 다시 시도해주세요.' },
                { status: 409 }
            );
        }
        if (lockKey) rankWriteLocks.add(lockKey);

        // Zod validation
        const validatedData = rankScoreConfigSchema.parse(body);

        // Check for duplicate rank within same sport event
        const existingConfigs = await getSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS);
        const isDuplicate = existingConfigs.some(
            (config) =>
                String(config.sport_event_id) === validatedData.sport_event_id &&
                String(config.rank) === validatedData.rank
        );

        if (isDuplicate) {
            return NextResponse.json(
                { error: '해당 세부종목/순위에 대한 설정이 이미 존재합니다. 수정해주세요.' },
                { status: 400 }
            );
        }

        // Generate ID
        const newId = validatedData.id || crypto.randomUUID();
        const now = new Date().toISOString().split('T')[0];

        // Append to sheet
        const newRow = [
            newId,
            validatedData.sport_event_id,
            validatedData.rank,
            validatedData.rank_label || formatRankLabel(String(validatedData.rank)),
            validatedData.acquired_score,
            validatedData.medal_score,
            now,
        ];
        await appendSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS, [newRow]);

        const newConfig: RankScoreConfig = {
            id: newId,
            sport_event_id: validatedData.sport_event_id,
            rank: validatedData.rank,
            rank_label: validatedData.rank_label || formatRankLabel(String(validatedData.rank)),
            acquired_score: validatedData.acquired_score,
            medal_score: validatedData.medal_score,
            updated_at: now,
        };

        return NextResponse.json(
            { message: '순위별 점수 설정이 등록되었습니다', data: newConfig },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create rank score config:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }
        if (isQuotaError(error)) {
            return NextResponse.json(
                { error: 'Google Sheets API 한도 초과. 1분 후 다시 시도해주세요.' },
                { status: 429 }
            );
        }

        return NextResponse.json({ error: 'Failed to create rank score config' }, { status: 500 });
    } finally {
        if (lockKey) rankWriteLocks.delete(lockKey);
    }
}

// PUT: Update a rank score config (Admin only)
export async function PUT(request: Request) {
    let lockKey: string | null = null;
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;
        lockKey = String(updateData?.sport_event_id || "");
        if (lockKey && rankWriteLocks.has(lockKey)) {
            return NextResponse.json(
                { error: '해당 세부종목의 순위 설정 저장이 진행 중입니다. 잠시 후 다시 시도해주세요.' },
                { status: 409 }
            );
        }
        if (lockKey) rankWriteLocks.add(lockKey);

        if (!id) {
            return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
        }

        // Partial validation
        const partialSchema = rankScoreConfigSchema.partial();
        const validatedData = partialSchema.parse(updateData);

        // Find existing data
        const rawData = await getSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id) === id
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '설정을 찾을 수 없습니다' }, { status: 404 });
        }

        const existingConfig = rawData[rowIndex];
        const now = new Date().toISOString().split('T')[0];

        // Merge updated data
        const updatedConfig: RankScoreConfig = {
            id,
            sport_event_id: validatedData.sport_event_id ?? String(existingConfig.sport_event_id),
            rank: validatedData.rank ?? String(existingConfig.rank),
            rank_label: validatedData.rank_label ?? (existingConfig.rank_label ? String(existingConfig.rank_label) : formatRankLabel(String(existingConfig.rank))),
            acquired_score: validatedData.acquired_score ?? Number(existingConfig.acquired_score),
            medal_score: validatedData.medal_score ?? Number(existingConfig.medal_score),
            updated_at: now,
        };

        // Update Google Sheets
        const updatedRow: (string | number | boolean)[] = [
            updatedConfig.id,
            updatedConfig.sport_event_id,
            updatedConfig.rank,
            updatedConfig.rank_label,
            updatedConfig.acquired_score,
            updatedConfig.medal_score,
            updatedConfig.updated_at || '',
        ];
        const sheetRow = rowIndex + 2;
        const range = `A${sheetRow}:G${sheetRow}`;
        await updateSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS, range, [updatedRow]);

        return NextResponse.json({
            message: '순위별 점수 설정이 수정되었습니다',
            data: updatedConfig,
        });
    } catch (error) {
        console.error('Failed to update rank score config:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }
        if (isQuotaError(error)) {
            return NextResponse.json(
                { error: 'Google Sheets API 한도 초과. 1분 후 다시 시도해주세요.' },
                { status: 429 }
            );
        }

        return NextResponse.json({ error: 'Failed to update rank score config' }, { status: 500 });
    } finally {
        if (lockKey) rankWriteLocks.delete(lockKey);
    }
}

// DELETE: Delete a rank score config (Admin only)
export async function DELETE(request: Request) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
        }

        // Find existing data
        const rawData = await getSheetData(SHEET_NAMES.RANK_SCORE_CONFIGS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id) === id
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '설정을 찾을 수 없습니다' }, { status: 404 });
        }

        // Delete from Google Sheets
        await deleteSheetRow(SHEET_NAMES.RANK_SCORE_CONFIGS, rowIndex);

        return NextResponse.json({ message: '순위별 점수 설정이 삭제되었습니다' });
    } catch (error) {
        console.error('Failed to delete rank score config:', error);
        if (isQuotaError(error)) {
            return NextResponse.json(
                { error: 'Google Sheets API 한도 초과. 1분 후 다시 시도해주세요.' },
                { status: 429 }
            );
        }
        return NextResponse.json({ error: 'Failed to delete rank score config' }, { status: 500 });
    }
}
