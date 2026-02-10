import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, deleteSheetRow } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';

// DELETE: Delete a sport event by ID
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

        const { id: eventId } = await context.params;

        // 기존 데이터 찾기
        const rawData = await getSheetData(SHEET_NAMES.SPORT_EVENTS);
        const rowIndex = rawData.findIndex(
            (row) => String(row.id) === eventId
        );

        if (rowIndex === -1) {
            return NextResponse.json({ error: '세부종목을 찾을 수 없습니다' }, { status: 404 });
        }

        // Google Sheets에서 삭제
        await deleteSheetRow(SHEET_NAMES.SPORT_EVENTS, rowIndex);

        return NextResponse.json({ message: '세부종목이 삭제되었습니다' });
    } catch (error) {
        console.error('Failed to delete sport event:', error);
        return NextResponse.json({ error: 'Failed to delete sport event' }, { status: 500 });
    }
}
