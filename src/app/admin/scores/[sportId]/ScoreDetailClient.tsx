"use client";

import { useState, useEffect } from "react";
import { Sport, SportEvent, Score, Region } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, Trophy, Target, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { RegionScoresDialog } from "./RegionScoresDialog";

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
    const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
    const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
    const [scores, setScores] = useState(initialScores);

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
                    onScoresUpdate={(allSportScores, updatedYear) => {
                        const otherYears = scores.filter((s) => (s.year ?? CURRENT_YEAR) !== updatedYear);
                        setScores([...otherYears, ...allSportScores]);
                    }}
                />
            )}
        </div>
    );
}
