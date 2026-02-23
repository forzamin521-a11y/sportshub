"use client";

import { useState, useEffect, useMemo } from "react";
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
    selectedYear: number;
}

export function ScoreDetailClient({
    sport,
    events,
    initialScores,
    regions,
    selectedYear,
}: ScoreDetailClientProps) {
    const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
    const [selectedEvent, setSelectedEvent] = useState<SportEvent | null>(null);
    const [scores, setScores] = useState(initialScores);

    // Update scores when initialScores changes (after router.refresh())
    useEffect(() => {
        setScores(initialScores);
    }, [initialScores]);

    const scoresByEventId = useMemo(() => {
        return scores.reduce((acc, score) => {
            const eventId = score.sport_event_id;
            if (!eventId) return acc;
            if (!acc[eventId]) {
                acc[eventId] = [];
            }
            acc[eventId].push(score);
            return acc;
        }, {} as Record<string, Score[]>);
    }, [scores]);

    const eventScoreCount = useMemo(() => {
        const countByEventId = new Map<string, number>();
        Object.entries(scoresByEventId).forEach(([eventId, eventScores]) => {
            countByEventId.set(eventId, eventScores.length);
        });
        return countByEventId;
    }, [scoresByEventId]);

    // Group events by division
    const eventsByDivision = useMemo(() => {
        return events.reduce((acc, event) => {
            if (!acc[event.division]) {
                acc[event.division] = [];
            }
            acc[event.division].push(event);
            return acc;
        }, {} as Record<string, SportEvent[]>);
    }, [events]);

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

    const getEventScoreCount = (eventId: string) => eventScoreCount.get(eventId) ?? 0;

    const handleEventClick = (event: SportEvent) => {
        setSelectedEvent(event);
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/admin/scores?year=${selectedYear}`}>
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
                        {selectedYear}년 기준으로 세부종목별 시/도 점수를 입력하고 수정할 수 있습니다.
                    </p>
                </div>

                <div className="space-y-2">
                    {divisions.map(division => {
                        const divisionEvents = eventsByDivision[division] || [];
                        const isExpanded = expandedDivisions.has(division);
                        const totalScores = divisionEvents.reduce((sum, e) => sum + (eventScoreCount.get(e.id) ?? 0), 0);

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
                    initialScores={scoresByEventId[selectedEvent.id] ?? []}
                    allScores={scores}
                    open={!!selectedEvent}
                    onOpenChange={(open) => !open && setSelectedEvent(null)}
                    onScoresUpdate={(allSportScores, updatedYear) => {
                        if (updatedYear === selectedYear) {
                            setScores(allSportScores);
                        }
                    }}
                />
            )}
        </div>
    );
}
