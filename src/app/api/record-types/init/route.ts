import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { DEFAULT_RECORD_TYPES } from '@/lib/record-types';

// POST: Initialize record types with default data (Admin only)
export async function POST() {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        // Check if already initialized
        const existingTypes = await getSheetData(SHEET_NAMES.RECORD_TYPES);
        if (existingTypes.length > 0) {
            return NextResponse.json(
                { error: '이미 신기록 타입이 등록되어 있습니다' },
                { status: 400 }
            );
        }

        // Prepare rows
        const rows = DEFAULT_RECORD_TYPES.map(type => [
            type.id,
            type.name,
            type.bonus_percentage
        ]);

        // Append all rows at once
        await appendSheetData(SHEET_NAMES.RECORD_TYPES, rows);

        return NextResponse.json(
            {
                message: `${DEFAULT_RECORD_TYPES.length}개의 기본 신기록 타입이 등록되었습니다`,
                count: DEFAULT_RECORD_TYPES.length
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to initialize record types:', error);
        return NextResponse.json({ error: 'Failed to initialize record types' }, { status: 500 });
    }
}
