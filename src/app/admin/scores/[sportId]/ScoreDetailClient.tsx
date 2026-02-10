"use client";

import { useState, useEffect } from "react";
import { Sport, SportEvent, Score, Region } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, Trophy, Target, Edit, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { RegionScoresDialog } from "./RegionScoresDialog";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

interface ScoreDetailClientProps {
    sport: Sport;
    events: SportEvent[];
    initialScores: Score[];
    regions: Region[];
}

export function ScoreDetailClient({
    sport,
    events,
    initialScores,
    regions,
}: ScoreDetailClientProps) {
    const router = useRouter();
    const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
    const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
    const [scores, setScores] = useState(initialScores);
    const [recalculating, setRecalculating] = useState(false);
    const [showRecalculateDialog, setShowRecalculateDialog] = useState(false);

    // Update scores when initialScores changes (after router.refresh())
    useEffect(() => {
        setScores(initialScores);
    }, [initialScores]);

    // Group events by division
    const eventsByDivision = events.reduce((acc, event) => {
        if (!acc[event.division]) {
            acc[event.division] = [];
        }
        acc[event.division].push(event);
        return acc;
    }, {} as Record<string, SportEvent[]>);

    const divisions = Object.keys(eventsByDivision).sort();

    const toggleDivision = (division: string) => {
        const newExpanded = new Set(expandedDivisions);
        if (newExpanded.has(division)) {
            newExpanded.delete(division);
        } else {
            newExpanded.add(division);
        }
        setExpandedDivisions(newExpanded);
    };

    const getEventScoreCount = (eventId: string) => {
        return scores.filter(s => s.sport_event_id === eventId).length;
    };

    const handleEventClick = (event: SportEvent) => {
        setSelectedEvent(event);
    };

    const handleRecalculateAll = async () => {
        setRecalculating(true);
        setSelectedEvent(null);

        try {
            const res = await fetch("/api/scores/save-and-recalculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sport_id: sport.id,
                    mode: "recalculate",
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "재계산 실패");
            }

            const result = await res.json();

            // Update local state with all recalculated scores
            setScores(result.data.scores);

            toast.success(
                `전체 환산점수가 재계산되었습니다.\n알점수: ${result.data.alphaScore.toFixed(4)}\n업데이트: ${result.data.updatedCount}개 점수`
            );

            router.refresh();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error?.message || "환산점수 재계산 중 오류가 발생했습니다.";

            if (errorMessage.includes("한도") || errorMessage.includes("quota") || errorMessage.includes("rate limit") || errorMessage.includes("429")) {
                toast.error("Google Sheets API 한도 초과. 잠시 후 다시 시도해주세요.");
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setRecalculating(false);
            setShowRecalculateDialog(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/scores">
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
                <Button
                    onClick={() => setShowRecalculateDialog(true)}
                    disabled={recalculating || scores.length === 0}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                    {recalculating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    전체 환산점수 재계산
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>확정점수: {sport.max_score}</span>
                    <span className="mx-2">•</span>
                    <Trophy className="h-4 w-4" />
                    <span>{events.length}개 세부종목</span>
                    <span className="mx-2">•</span>
                    <span>{divisions.length}개 종별</span>
                </div>
            </div>

            {/* Division Tree */}
            <div className="glass-card p-5">
                <div className="mb-4">
                    <h3 className="font-semibold">세부종목별 점수 입력</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        세부종목을 선택하면 모든 시/도의 점수를 입력하고 수정할 수 있습니다.
                    </p>
                </div>

                <div className="space-y-2">
                    {divisions.map(division => {
                        const divisionEvents = eventsByDivision[division] || [];
                        const isExpanded = expandedDivisions.has(division);
                        const totalScores = divisionEvents.reduce((sum, e) => sum + getEventScoreCount(e.id), 0);

                        return (
                            <div key={division} className="border rounded-lg overflow-hidden">
                                {/* Division Header */}
                                <div
                                    className="flex items-center justify-between p-3 bg-accent/20 cursor-pointer hover:bg-accent/30 transition-colors"
                                    onClick={() => toggleDivision(division)}
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="font-semibold">{division}</span>
                                        <Badge variant="outline">
                                            {divisionEvents.length}개 세부종목
                                        </Badge>
                                    </div>
                                    <Badge variant={totalScores > 0 ? "default" : "secondary"}>
                                        {totalScores}개 점수 입력됨
                                    </Badge>
                                </div>

                                {/* Events List */}
                                {isExpanded && (
                                    <div className="p-3 space-y-2">
                                        {divisionEvents.map(event => {
                                            const scoreCount = getEventScoreCount(event.id);

                                            return (
                                                <div
                                                    key={event.id}
                                                    className="border rounded-lg p-3 bg-background hover:shadow-md transition-all cursor-pointer"
                                                    onClick={() => handleEventClick(event)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{event.event_name}</span>
                                                            {scoreCount > 0 ? (
                                                                <Badge variant="default">
                                                                    {scoreCount}/{regions.length} 시/도
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">
                                                                    점수 미입력
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <Button size="sm" variant="outline">
                                                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                                                            점수 입력
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Region Scores Dialog */}
            {selectedEvent && (
                <RegionScoresDialog
                    event={selectedEvent}
                    sport={sport}
                    regions={regions}
                    initialScores={scores.filter(s => s.sport_event_id === selectedEvent.id)}
                    allScores={scores}
                    open={!!selectedEvent}
                    onOpenChange={(open) => !open && setSelectedEvent(null)}
                    onScoresUpdate={(allSportScores) => {
                        // Replace all scores with recalculated data from server
                        setScores(allSportScores);
                    }}
                />
            )}

            {/* Recalculate Confirmation Dialog */}
            <AlertDialog open={showRecalculateDialog} onOpenChange={setShowRecalculateDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>전체 환산점수 재계산</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <div>현재까지 입력된 점수를 기준으로 모든 환산점수를 재계산합니다.</div>
                                <div className="font-semibold text-orange-600">
                                    ⚠️ 기존의 환산점수 데이터는 덮어씌워지며, 이 작업은 되돌릴 수 없습니다.
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    • 대상: {sport.name}의 모든 세부종목 ({scores.length}개 점수)
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    • 재계산 항목: 환산점수, 신기록가산, 총점
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRecalculateAll}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            재계산 실행
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
