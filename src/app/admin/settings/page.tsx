"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { RecordTypesCard } from "@/components/admin/settings/RecordTypesCard";
import { RegionsCard } from "@/components/admin/settings/RegionsCard";

export default function SettingsPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("모든 필드를 입력해주세요.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("새 비밀번호가 일치하지 않습니다.");
            return;
        }

        if (newPassword.length < 6) {
            setError("새 비밀번호는 최소 6자 이상이어야 합니다.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "비밀번호 변경에 실패했습니다.");
            } else {
                setSuccess(true);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                toast.success("비밀번호가 변경되었습니다. 다시 로그인해주세요.");

                setTimeout(() => {
                    signOut({ callbackUrl: "/login" });
                }, 3000);
            }
        } catch (error) {
            setError("비밀번호 변경 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5 animate-fade-in-up">
            <div>
                <h2 className="text-2xl font-bold gradient-text">설정</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    계정 및 시스템 설정
                </p>
            </div>

            <div className="grid gap-5 max-w-2xl">
                <div className="glass-card p-6">
                    <h3 className="font-semibold mb-1">비밀번호 변경</h3>
                    <p className="text-xs text-muted-foreground mb-4">관리자 계정의 비밀번호를 변경합니다.</p>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="border-green-500/50 bg-green-50 text-green-700">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription>
                                    비밀번호가 성공적으로 변경되었습니다. 잠시 후 로그인 페이지로 이동합니다...
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="currentPassword" className="text-xs">현재 비밀번호</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={loading || success}
                                placeholder="현재 비밀번호를 입력하세요"
                                className="rounded-xl bg-white/50 border-border/50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="newPassword" className="text-xs">새 비밀번호</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading || success}
                                placeholder="새 비밀번호 (최소 6자)"
                                className="rounded-xl bg-white/50 border-border/50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirmPassword" className="text-xs">새 비밀번호 확인</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading || success}
                                placeholder="새 비밀번호를 다시 입력하세요"
                                className="rounded-xl bg-white/50 border-border/50"
                            />
                        </div>

                        <Button type="submit" disabled={loading || success} className="rounded-xl">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    변경 중...
                                </>
                            ) : success ? (
                                "변경 완료"
                            ) : (
                                "비밀번호 변경"
                            )}
                        </Button>
                    </form>
                </div>

                <div className="glass-card p-6">
                    <h3 className="font-semibold mb-1">시스템 정보</h3>
                    <p className="text-xs text-muted-foreground mb-4">현재 시스템 상태 및 정보</p>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-sm font-medium">프로젝트명</span>
                            <span className="text-sm text-muted-foreground">제106회 전국체육대회 대시보드</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-sm font-medium">버전</span>
                            <span className="text-sm text-muted-foreground">1.0.0</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium">프레임워크</span>
                            <span className="text-sm text-muted-foreground">Next.js 16.1.5</span>
                        </div>
                    </div>
                </div>

                <RegionsCard />

                <RecordTypesCard />

                <div className="glass-card p-6 bg-blue-50/50 border-blue-200/50">
                    <h3 className="font-semibold mb-1 text-blue-900">💡 종목 설정 안내</h3>
                    <p className="text-sm text-blue-800 mt-2">
                        <strong>종목별 확정점수, 순위별 점수, 신기록 가산 설정</strong>은 이제 <strong>종목 관리</strong> 페이지에서 통합 관리됩니다.
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                        종목 관리 → 종목 카드 클릭 → 해당 종목의 모든 설정을 한 곳에서 확인하고 수정할 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
