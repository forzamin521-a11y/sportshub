import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, updateSheetData, deleteSheetRow } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { Sport } from '@/types';
import { sportSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// GET: Fetch a single sport by ID
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sportId } = await context.params;
        const rawData = await getSheetData(SHEET_NAMES.SPORTS);

        const sportRow = rawData.find(
            (row) => String(row.id).toLowerCase() === sportId.toLowerCase()
        );

        if (!sportRow) {
            return NextResponse.json({ error: '종목을 찾을 수 없습니다' }, { status: 404 });
        }

        const sport: Sport = {
            id: String(sportRow.id),
            name: String(sportRow.name),
            sub_name: sportRow.sub_name ? String(sportRow.sub_name) : undefined,
            max_score: Number(sportRow.max_score || 0),
            category: sportRow.category ? String(sportRow.category) : undefined,
        };

        return NextResponse.json({ data: sport });
    } catch (error) {
        console.error('Failed to fetch sport:', error);
        return NextResponse.json({ error: 'Failed to fetch sport' }, { status: 500 });
    }
}

// PUT: Update a sport by ID
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { id: sportId } = await context.params;
        const body = await request.json();

        // Zod 유효성 검사 (부분 업데이트 허용)
        const partialSportSchema = sportSchema.partial();
        const validatedData = partialSportSchema.parse(body);

        // 기존 데이터 찾기
        const rawData = await getSheetData(SHEET_NAMES.SPORTS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id).toLowerCase() === sportId.toLowerCase()
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '종목을 찾을 수 없습니다' }, { status: 404 });
        }

        const existingSport = rawData[rowIndex];

        // 업데이트할 데이터 병합
        const updatedSport = {
            id: validatedData.id ?? String(existingSport.id),
            name: validatedData.name ?? String(existingSport.name),
            sub_name: validatedData.sub_name ?? (existingSport.sub_name ? String(existingSport.sub_name) : undefined),
            max_score: validatedData.max_score ?? Number(existingSport.max_score || 0),
            category: validatedData.category ?? (existingSport.category ? String(existingSport.category) : undefined),
        };

        // Google Sheets 업데이트
        const updatedRow = [
            updatedSport.id,
            updatedSport.name,
            updatedSport.sub_name || '',
            updatedSport.max_score,
        ];
        // rowIndex는 데이터 배열의 인덱스(0-based)이므로, 실제 시트 행은 +2 (헤더 +1, 0-based to 1-based +1)
        const sheetRow = rowIndex + 2;
        const range = `A${sheetRow}:D${sheetRow}`;
        await updateSheetData(SHEET_NAMES.SPORTS, range, [updatedRow]);

        return NextResponse.json({
            message: '종목 정보가 수정되었습니다',
            data: updatedSport,
        });
    } catch (error) {
        console.error('Failed to update sport:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: 'Failed to update sport' }, { status: 500 });
    }
}

// DELETE: Delete a sport by ID
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { id: sportId } = await context.params;

        // 기존 데이터 찾기
        const rawData = await getSheetData(SHEET_NAMES.SPORTS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id).toLowerCase() === sportId.toLowerCase()
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '종목을 찾을 수 없습니다' }, { status: 404 });
        }

        // Google Sheets에서 삭제
        await deleteSheetRow(SHEET_NAMES.SPORTS, rowIndex);

        return NextResponse.json({ message: '종목이 삭제되었습니다' });
    } catch (error) {
        console.error('Failed to delete sport:', error);
        return NextResponse.json({ error: 'Failed to delete sport' }, { status: 500 });
    }
}
