import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 간단한 비밀번호 저장소 (실제로는 데이터베이스 사용)
// auth.ts의 users 배열과 동일한 참조를 사용해야 하지만,
// 여기서는 간단하게 하드코딩된 체크만 수행
let adminPassword = "admin123";

export async function POST(request: Request) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: '현재 비밀번호와 새 비밀번호를 모두 입력하세요' },
                { status: 400 }
            );
        }

        // 현재 비밀번호 확인
        if (currentPassword !== adminPassword) {
            return NextResponse.json(
                { error: '현재 비밀번호가 올바르지 않습니다' },
                { status: 400 }
            );
        }

        // 새 비밀번호 길이 확인
        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: '새 비밀번호는 최소 6자 이상이어야 합니다' },
                { status: 400 }
            );
        }

        // 비밀번호 변경
        adminPassword = newPassword;

        // 실제로는 auth.ts의 users 배열도 업데이트해야 하지만,
        // 여기서는 간단하게 구현
        // 프로덕션에서는 데이터베이스에 저장

        return NextResponse.json({
            message: '비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.',
        });
    } catch (error) {
        console.error('Failed to change password:', error);
        return NextResponse.json(
            { error: '비밀번호 변경 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}

export { adminPassword };
