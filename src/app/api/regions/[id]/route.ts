import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, updateSheetData, deleteSheetRow } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { Region } from '@/types';
import { regionSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// GET: Fetch a single region by ID
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: regionId } = await context.params;
        const rawData = await getSheetData(SHEET_NAMES.REGIONS);

        const regionRow = rawData.find(
            (row) => String(row.id).toUpperCase() === regionId.toUpperCase()
        );

        if (!regionRow) {
            return NextResponse.json({ error: '시도를 찾을 수 없습니다' }, { status: 404 });
        }

        const region: Region = {
            id: String(regionRow.id),
            name: String(regionRow.name),
            is_host: String(regionRow.is_host).toLowerCase() === 'true',
            color: String(regionRow.color),
        };

        return NextResponse.json({ data: region });
    } catch (error) {
        console.error('Failed to fetch region:', error);
        return NextResponse.json({ error: 'Failed to fetch region' }, { status: 500 });
    }
}

// PUT: Update a region by ID
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

        const { id: regionId } = await context.params;
        const body = await request.json();

        // Zod 유효성 검사 (부분 업데이트 허용)
        const partialRegionSchema = regionSchema.partial();
        const validatedData = partialRegionSchema.parse(body);

        // 기존 데이터 찾기
        const rawData = await getSheetData(SHEET_NAMES.REGIONS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id).toUpperCase() === regionId.toUpperCase()
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '시도를 찾을 수 없습니다' }, { status: 404 });
        }

        const existingRegion = rawData[rowIndex];

        // 업데이트할 데이터 병합
        const updatedRegion = {
            id: validatedData.id ?? String(existingRegion.id),
            name: validatedData.name ?? String(existingRegion.name),
            is_host: validatedData.is_host ?? (String(existingRegion.is_host).toLowerCase() === 'true'),
            color: validatedData.color ?? String(existingRegion.color),
        };

        // Google Sheets 업데이트
        const updatedRow = [
            updatedRegion.id,
            updatedRegion.name,
            updatedRegion.is_host,
            updatedRegion.color,
        ];
        // rowIndex는 데이터 배열의 인덱스(0-based)이므로, 실제 시트 행은 +2 (헤더 +1, 0-based to 1-based +1)
        const sheetRow = rowIndex + 2;
        const range = `A${sheetRow}:D${sheetRow}`;
        await updateSheetData(SHEET_NAMES.REGIONS, range, [updatedRow]);

        return NextResponse.json({
            message: '시도 정보가 수정되었습니다',
            data: updatedRegion,
        });
    } catch (error) {
        console.error('Failed to update region:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: 'Failed to update region' }, { status: 500 });
    }
}

// DELETE: Delete a region by ID
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

        const { id: regionId } = await context.params;

        // 기존 데이터 찾기
        const rawData = await getSheetData(SHEET_NAMES.REGIONS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id).toUpperCase() === regionId.toUpperCase()
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '시도를 찾을 수 없습니다' }, { status: 404 });
        }

        // Google Sheets에서 삭제
        await deleteSheetRow(SHEET_NAMES.REGIONS, rowIndex);

        return NextResponse.json({ message: '시도가 삭제되었습니다' });
    } catch (error) {
        console.error('Failed to delete region:', error);
        return NextResponse.json({ error: 'Failed to delete region' }, { status: 500 });
    }
}
