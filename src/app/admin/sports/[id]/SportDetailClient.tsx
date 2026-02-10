"use client";

import { useState } from "react";
import { Sport, SportEvent, RankScoreConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, Trophy, Target } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SportRankScoreTab } from "@/components/admin/sport-detail/SportRankScoreTab";

interface SportDetailClientProps {
    sport: Sport;
    events: SportEvent[];
    initialRankScores: RankScoreConfig[];
}

export function SportDetailClient({
    sport,
    events,
    initialRankScores,
}: SportDetailClientProps) {
    const router = useRouter();
    const [maxScore, setMaxScore] = useState(sport.max_score);
    const [saving, setSaving] = useState(false);

    const handleSaveMaxScore = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/sports/${sport.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ max_score: maxScore }),
            });

            if (!res.ok) {
                throw new Error("Failed to update max score");
            }

            toast.success("확정점수가 저장되었습니다.");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    // Group events by division
    const eventsByDivision = events.reduce((acc, event) => {
        if (!acc[event.division]) {
            acc[event.division] = [];
        }
        acc[event.division].push(event);
        return acc;
    }, {} as Record<string, SportEvent[]>);

    const divisions = Object.keys(eventsByDivision).sort();

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/sports">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold gradient-text">{sport.name}</h2>
                    {sport.sub_name && (
                        <p className="text-sm text-muted-foreground mt-0.5">{sport.sub_name}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                    <span>{events.length}개 세부종목</span>
                    <span className="mx-2">•</span>
                    <span>{divisions.length}개 종별</span>
                </div>
            </div>

            {/* 확정점수 섹션 */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">확정점수</h3>
                </div>
                <div className="flex items-end gap-4">
                    <div className="flex-1 max-w-xs">
                        <Label>종목 확정점수 (최대 배점)</Label>
                        <Input
                            type="number"
                            value={maxScore}
                            onChange={(e) => setMaxScore(Number(e.target.value))}
                            className="mt-1.5"
                        />
                    </div>
                    <Button
                        onClick={handleSaveMaxScore}
                        disabled={saving || maxScore === sport.max_score}
                        className="rounded-xl"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                저장
                            </>
                        )}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    이 종목의 최대 배점입니다. 모든 세부종목의 점수 계산에 영향을 줍니다.
                </p>
            </div>

            {/* 순위별 점수 */}
            <SportRankScoreTab
                sport={sport}
                events={events}
                eventsByDivision={eventsByDivision}
                divisions={divisions}
                initialRankScores={initialRankScores}
            />
        </div>
    );
}
