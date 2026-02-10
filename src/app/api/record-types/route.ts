import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { RecordType } from '@/lib/record-types';

// GET: Fetch all record types
export async function GET() {
    try {
        const data = await getSheetData(SHEET_NAMES.RECORD_TYPES);

        const recordTypes: RecordType[] = data.map(row => ({
            id: String(row.id),
            name: String(row.name),
            bonus_percentage: Number(row.bonus_percentage),
        }));

        return NextResponse.json({ data: recordTypes });
    } catch (error) {
        console.error('Failed to fetch record types:', error);
        return NextResponse.json({ error: 'Failed to fetch record types' }, { status: 500 });
    }
}

// POST: Create a new record type (Admin only)
export async function POST(request: Request) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, bonus_percentage } = body;

        if (!id || !name || typeof bonus_percentage !== 'number') {
            return NextResponse.json(
                { error: 'ID, 이름, 가산율이 필요합니다' },
                { status: 400 }
            );
        }

        // Check for duplicate ID
        const existingTypes = await getSheetData(SHEET_NAMES.RECORD_TYPES);
        const duplicate = existingTypes.find(type => String(type.id) === id);

        if (duplicate) {
            return NextResponse.json(
                { error: '이미 존재하는 ID입니다' },
                { status: 400 }
            );
        }

        // Append new record type
        await appendSheetData(SHEET_NAMES.RECORD_TYPES, [
            [id, name, bonus_percentage]
        ]);

        return NextResponse.json(
            { message: '신기록 타입이 등록되었습니다' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create record type:', error);
        return NextResponse.json({ error: 'Failed to create record type' }, { status: 500 });
    }
}
