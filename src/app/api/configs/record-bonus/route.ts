import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData, updateSheetData, deleteSheetRow } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { RecordBonusConfig } from '@/types';
import { recordBonusConfigSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// GET: Fetch all record bonus configs
export async function GET() {
    try {
        const rawData = await getSheetData(SHEET_NAMES.RECORD_BONUS_CONFIGS);

        const configs: RecordBonusConfig[] = rawData.map((row) => ({
            id: String(row.id),
            sport_event_id: String(row.sport_event_id),
            bonus_multiplier: Number(row.bonus_multiplier),
            updated_at: row.updated_at ? String(row.updated_at) : undefined,
        }));

        return NextResponse.json({ data: configs });
    } catch (error) {
        console.error('Failed to fetch record bonus configs:', error);
        return NextResponse.json({ error: 'Failed to fetch record bonus configs' }, { status: 500 });
    }
}

// POST: Add a new record bonus config (Admin only)
export async function POST(request: Request) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();

        // Zod 유효성 검사
        const validatedData = recordBonusConfigSchema.parse(body);

        // 중복 체크 - 같은 세부종목에 대한 설정이 이미 있는지
        const existingConfigs = await getSheetData(SHEET_NAMES.RECORD_BONUS_CONFIGS);
        const isDuplicate = existingConfigs.some(
            (config) => String(config.sport_event_id) === validatedData.sport_event_id
        );

        if (isDuplicate) {
            return NextResponse.json(
                { error: '해당 세부종목에 대한 설정이 이미 존재합니다. 수정해주세요.' },
                { status: 400 }
            );
        }

        // ID 생성
        const newId = validatedData.id || crypto.randomUUID();
        const now = new Date().toISOString().split('T')[0];

        // 데이터 추가
        const newRow = [
            newId,
            validatedData.sport_event_id,
            validatedData.bonus_multiplier,
            now,
        ];
        await appendSheetData(SHEET_NAMES.RECORD_BONUS_CONFIGS, [newRow]);

        const newConfig: RecordBonusConfig = {
            id: newId,
            sport_event_id: validatedData.sport_event_id,
            bonus_multiplier: validatedData.bonus_multiplier,
            updated_at: now,
        };

        return NextResponse.json(
            { message: '신기록 가산 설정이 등록되었습니다', data: newConfig },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create record bonus config:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: 'Failed to create record bonus config' }, { status: 500 });
    }
}

// PUT: Update a record bonus config (Admin only)
export async function PUT(request: Request) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
        }

        // Zod 유효성 검사 (부분 업데이트 허용)
        const partialSchema = recordBonusConfigSchema.partial();
        const validatedData = partialSchema.parse(updateData);

        // 기존 데이터 찾기
        const rawData = await getSheetData(SHEET_NAMES.RECORD_BONUS_CONFIGS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id) === id
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '설정을 찾을 수 없습니다' }, { status: 404 });
        }

        const existingConfig = rawData[rowIndex];
        const now = new Date().toISOString().split('T')[0];

        // 업데이트할 데이터 병합
        const updatedConfig: RecordBonusConfig = {
            id,
            sport_event_id: validatedData.sport_event_id ?? String(existingConfig.sport_event_id),
            bonus_multiplier: validatedData.bonus_multiplier ?? Number(existingConfig.bonus_multiplier),
            updated_at: now,
        };

        // Google Sheets 업데이트
        const updatedRow: (string | number | boolean)[] = [
            updatedConfig.id,
            updatedConfig.sport_event_id,
            updatedConfig.bonus_multiplier,
            updatedConfig.updated_at || '',
        ];
        const sheetRow = rowIndex + 2;
        const range = `A${sheetRow}:D${sheetRow}`;
        await updateSheetData(SHEET_NAMES.RECORD_BONUS_CONFIGS, range, [updatedRow]);

        return NextResponse.json({
            message: '신기록 가산 설정이 수정되었습니다',
            data: updatedConfig,
        });
    } catch (error) {
        console.error('Failed to update record bonus config:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: 'Failed to update record bonus config' }, { status: 500 });
    }
}

// DELETE: Delete a record bonus config (Admin only)
export async function DELETE(request: Request) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
        }

        // 기존 데이터 찾기
        const rawData = await getSheetData(SHEET_NAMES.RECORD_BONUS_CONFIGS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id) === id
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '설정을 찾을 수 없습니다' }, { status: 404 });
        }

        // Google Sheets에서 삭제
        await deleteSheetRow(SHEET_NAMES.RECORD_BONUS_CONFIGS, rowIndex);

        return NextResponse.json({ message: '신기록 가산 설정이 삭제되었습니다' });
    } catch (error) {
        console.error('Failed to delete record bonus config:', error);
        return NextResponse.json({ error: 'Failed to delete record bonus config' }, { status: 500 });
    }
}
