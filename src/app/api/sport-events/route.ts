import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetData } from '@/lib/google-sheets';
import { SHEET_NAMES } from '@/lib/constants';
import { SportEvent } from '@/types';
import { sportEventSchema } from '@/lib/validations';
import { ZodError } from 'zod';

// GET: Fetch all sport events
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sportId = searchParams.get('sport_id');

        const rawData = await getSheetData(SHEET_NAMES.SPORT_EVENTS);

        let events: SportEvent[] = rawData.map((row) => ({
            id: String(row.id),
            sport_id: String(row.sport_id),
            division: String(row.division) as SportEvent['division'],
            event_name: String(row.event_name),
            max_score: row.max_score ? Number(row.max_score) : undefined,
        }));

        // Filter by sport_id if provided
        if (sportId) {
            events = events.filter(e => e.sport_id === sportId);
        }

        return NextResponse.json({ data: events });
    } catch (error) {
        console.error('Failed to fetch sport events:', error);
        return NextResponse.json({ error: 'Failed to fetch sport events' }, { status: 500 });
    }
}

// POST: Add a new sport event (Admin only)
export async function POST(request: Request) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();

        // Zod 유효성 검사
        const validatedData = sportEventSchema.parse(body);

        // ID 생성 (제공되지 않은 경우): sport_id-division-event_name
        const newId = validatedData.id || `${validatedData.sport_id}-${validatedData.division}-${validatedData.event_name}`;

        // 중복 ID 체크
        const existingEvents = await getSheetData(SHEET_NAMES.SPORT_EVENTS);
        const isDuplicate = existingEvents.some(
            (event) => String(event.id).toLowerCase() === newId.toLowerCase()
        );

        if (isDuplicate) {
            return NextResponse.json(
                { error: '이미 존재하는 세부종목입니다' },
                { status: 400 }
            );
        }

        // 데이터 추가
        const newRow = [
            newId,
            validatedData.sport_id,
            validatedData.division,
            validatedData.event_name,
            validatedData.max_score || '',
        ];
        await appendSheetData(SHEET_NAMES.SPORT_EVENTS, [newRow]);

        const newEvent: SportEvent = {
            id: newId,
            sport_id: validatedData.sport_id,
            division: validatedData.division,
            event_name: validatedData.event_name,
            max_score: validatedData.max_score,
        };

        return NextResponse.json(
            { message: '세부종목이 등록되었습니다', data: newEvent },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create sport event:', error);

        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: '입력 데이터가 유효하지 않습니다', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: 'Failed to create sport event' }, { status: 500 });
    }
}
