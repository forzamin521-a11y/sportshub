import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, updateSheetData, deleteSheetRow } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET: Fetch a single record type
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const data = await getSheetData(SHEET_NAMES.RECORD_TYPES);
        const recordType = data.find(row => String(row.id) === id);

        if (!recordType) {
            return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
        }

        return NextResponse.json({
            data: {
                id: String(recordType.id),
                name: String(recordType.name),
                bonus_percentage: Number(recordType.bonus_percentage),
            }
        });
    } catch (error) {
        console.error('Failed to fetch record type:', error);
        return NextResponse.json({ error: 'Failed to fetch record type' }, { status: 500 });
    }
}

// PUT: Update a record type (Admin only)
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, bonus_percentage } = body;

        if (!name || typeof bonus_percentage !== 'number') {
            return NextResponse.json(
                { error: '이름과 가산율이 필요합니다' },
                { status: 400 }
            );
        }

        const data = await getSheetData(SHEET_NAMES.RECORD_TYPES);
        const rowIndex = data.findIndex(row => String(row.id) === id);

        if (rowIndex === -1) {
            return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
        }

        // Update the row (row index + 2 for header and 0-based)
        const range = `A${rowIndex + 2}:C${rowIndex + 2}`;
        await updateSheetData(SHEET_NAMES.RECORD_TYPES, range, [
            [id, name, bonus_percentage]
        ]);

        return NextResponse.json({ message: '신기록 타입이 수정되었습니다' });
    } catch (error) {
        console.error('Failed to update record type:', error);
        return NextResponse.json({ error: 'Failed to update record type' }, { status: 500 });
    }
}

// DELETE: Delete a record type (Admin only)
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { id } = await params;
        const data = await getSheetData(SHEET_NAMES.RECORD_TYPES);
        const rowIndex = data.findIndex(row => String(row.id) === id);

        if (rowIndex === -1) {
            return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
        }

        await deleteSheetRow(SHEET_NAMES.RECORD_TYPES, rowIndex);

        return NextResponse.json({ message: '신기록 타입이 삭제되었습니다' });
    } catch (error) {
        console.error('Failed to delete record type:', error);
        return NextResponse.json({ error: 'Failed to delete record type' }, { status: 500 });
    }
}
