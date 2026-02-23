import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { Region } from '@/types';
import { regionSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// GET: Fetch all regions
export async function GET() {
    try {
        const rawData = await getSheetData(SHEET_NAMES.REGIONS);

        const regions: Region[] = rawData.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            is_host: String(row.is_host).toLowerCase() === 'true',
            color: String(row.color),
        }));

        return NextResponse.json({ data: regions });
    } catch (error) {
        console.error('Failed to fetch regions:', error);
        return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
    }
}

// POST: Add a new region (Admin only)
export async function POST(request: Request) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();

        // Zod 유효성 검사
        const validatedData = regionSchema.parse(body);

        // 중복 ID 체크
        const existingRegions = await getSheetData(SHEET_NAMES.REGIONS);
        const isDuplicate = existingRegions.some(
            (region) => String(region.id).toUpperCase() === validatedData.id.toUpperCase()
        );

        if (isDuplicate) {
            return NextResponse.json(
                { error: '이미 존재하는 시도 코드입니다' },
                { status: 400 }
            );
        }

        // 데이터 추가
        const newRow = [
            validatedData.id,
            validatedData.name,
            validatedData.is_host,
            validatedData.color,
        ];
        await appendSheetData(SHEET_NAMES.REGIONS, [newRow]);

        const newRegion: Region = {
            id: validatedData.id,
            name: validatedData.name,
            is_host: validatedData.is_host,
            color: validatedData.color,
        };

        return NextResponse.json(
            { message: '시도가 등록되었습니다', data: newRegion },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create region:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: 'Failed to create region' }, { status: 500 });
    }
}
