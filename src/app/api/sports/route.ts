import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { Sport } from '@/types';
import { sportSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// GET: Fetch all sports
export async function GET() {
    try {
        const rawData = await getSheetData(SHEET_NAMES.SPORTS);

        const sports: Sport[] = rawData.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            sub_name: row.sub_name ? String(row.sub_name) : undefined,
            max_score: Number(row.max_score || 0),
            category: row.category ? String(row.category) : undefined,
        }));

        return NextResponse.json({ data: sports });
    } catch (error) {
        console.error('Failed to fetch sports:', error);
        return NextResponse.json({ error: 'Failed to fetch sports' }, { status: 500 });
    }
}

// POST: Add a new sport (Admin only)
export async function POST(request: Request) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();

        // Zod 유효성 검사
        const validatedData = sportSchema.parse(body);

        // ID 생성 (제공되지 않은 경우)
        const newId = validatedData.id || crypto.randomUUID();

        // 중복 ID 체크
        const existingSports = await getSheetData(SHEET_NAMES.SPORTS);
        const isDuplicate = existingSports.some(
            (sport) => String(sport.id).toLowerCase() === newId.toLowerCase()
        );

        if (isDuplicate) {
            return NextResponse.json(
                { error: '이미 존재하는 종목 ID입니다' },
                { status: 400 }
            );
        }

        // 데이터 추가
        const newRow = [
            newId,
            validatedData.name,
            validatedData.sub_name || '',
            validatedData.max_score,
        ];
        await appendSheetData(SHEET_NAMES.SPORTS, [newRow]);

        const newSport: Sport = {
            id: newId,
            name: validatedData.name,
            sub_name: validatedData.sub_name,
            max_score: validatedData.max_score,
            category: validatedData.category,
        };

        return NextResponse.json(
            { message: '종목이 등록되었습니다', data: newSport },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create sport:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: 'Failed to create sport' }, { status: 500 });
    }
}
