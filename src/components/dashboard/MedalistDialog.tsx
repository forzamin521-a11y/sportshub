"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Score, Sport, SportEvent } from "@/types";
import { Medal, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatOneDecimal } from "@/lib/number-format";

interface MedalistDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    medalType: 'gold' | 'silver' | 'bronze';
    scores: Score[];
    regionId: string;
    sports: Sport[];
    sportEvents: SportEvent[];
}

interface SportGroup {
    sportId: string;
    sportName: string;
    totalMedals: number;
    divisions: {
        divisionName: string;
        totalMedals: number;
        events: {
            eventId: string;
            eventName: string;
            medals: number;
            score: Score;
        }[];
    }[];
}

export function MedalistDialog({ open, onOpenChange, medalType, scores, regionId, sports, sportEvents }: MedalistDialogProps) {
    const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set());
    const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

    const medalConfig = {
        gold: {
            title: '금메달',
            icon: '🥇',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/30',
            hoverBg: 'hover:bg-yellow-500/20',
        },
        silver: {
            title: '은메달',
            icon: '🥈',
            color: 'text-gray-600',
            bgColor: 'bg-gray-400/10',
            borderColor: 'border-gray-400/30',
            hoverBg: 'hover:bg-gray-400/20',
        },
        bronze: {
            title: '동메달',
            icon: '🥉',
            color: 'text-orange-600',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/30',
            hoverBg: 'hover:bg-orange-500/20',
        },
    };

    const config = medalConfig[medalType];

    // 종목별로 그룹핑
    const groupedData = useMemo(() => {
        const sportMap = new Map<string, Map<string, Score[]>>();

        scores.forEach(score => {
            if (score.region_id !== regionId) return;

            const medalCount = score[medalType] || 0;
            if (medalCount === 0) return;

            const sportId = score.sport_id || '기타';
            const division = score.division || '일반';

            if (!sportMap.has(sportId)) {
                sportMap.set(sportId, new Map());
            }

            const divisionMap = sportMap.get(sportId)!;
            if (!divisionMap.has(division)) {
                divisionMap.set(division, []);
            }

            divisionMap.get(division)!.push(score);
        });

        // Map을 SportGroup 배열로 변환
        const result: SportGroup[] = [];

        sportMap.forEach((divisionMap, sportId) => {
            const sport = sports.find(s => s.id === sportId);
            const sportName = sport ? sport.name : sportId;

            const divisions: SportGroup['divisions'] = [];
            let sportTotalMedals = 0;

            divisionMap.forEach((scoresList, divisionName) => {
                const events = scoresList.map(score => {
                    const sportEvent = sportEvents.find(se => se.id === score.sport_event_id);
                    const eventName = sportEvent ? sportEvent.event_name : (score.sport_event_id || '종합');

                    return {
                        eventId: score.sport_event_id || 'general',
                        eventName,
                        medals: score[medalType] || 0,
                        score,
                    };
                });

                const divisionTotal = events.reduce((sum, e) => sum + e.medals, 0);
                sportTotalMedals += divisionTotal;

                divisions.push({
                    divisionName,
                    totalMedals: divisionTotal,
                    events,
                });
            });

            // 메달 수 많은 순으로 정렬
            divisions.sort((a, b) => b.totalMedals - a.totalMedals);

            result.push({
                sportId,
                sportName,
                totalMedals: sportTotalMedals,
                divisions,
            });
        });

        // 종목도 메달 수 많은 순으로 정렬
        result.sort((a, b) => b.totalMedals - a.totalMedals);

        return result;
    }, [scores, regionId, medalType, sports, sportEvents]);

    const totalMedals = groupedData.reduce((sum, sport) => sum + sport.totalMedals, 0);

    const toggleSport = (sportId: string) => {
        const newExpanded = new Set(expandedSports);
        if (newExpanded.has(sportId)) {
            newExpanded.delete(sportId);
        } else {
            newExpanded.add(sportId);
        }
        setExpandedSports(newExpanded);
    };

    const toggleDivision = (key: string) => {
        const newExpanded = new Set(expandedDivisions);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedDivisions(newExpanded);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <span className="text-3xl">{config.icon}</span>
                        <span className={config.color}>{config.title} 현황</span>
                        <Badge variant="secondary" className="ml-2 text-base">
                            총 {formatOneDecimal(totalMedals)}개
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[65vh] pr-4">
                    {groupedData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Medal className="h-20 w-20 mb-4 opacity-20" />
                            <p className="text-lg">획득한 {config.title}이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {groupedData.map((sport) => {
                                const isExpanded = expandedSports.has(sport.sportId);

                                return (
                                    <div key={sport.sportId} className="space-y-1">
                                        {/* 종목 레벨 */}
                                        <button
                                            onClick={() => toggleSport(sport.sportId)}
                                            className={`w-full flex items-center justify-between p-4 rounded-lg border ${config.borderColor} ${config.bgColor} ${config.hoverBg} transition-all`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isExpanded ? (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                )}
                                                <span className="text-xl">{config.icon}</span>
                                                <span className="font-bold text-lg">{sport.sportName}</span>
                                            </div>
                                            <Badge className={`${config.color} text-lg px-3 py-1`} variant="secondary">
                                                {formatOneDecimal(sport.totalMedals)}개
                                            </Badge>
                                        </button>

                                        {/* 종별 레벨 */}
                                        {isExpanded && (
                                            <div className="ml-8 space-y-1">
                                                {sport.divisions.map((division) => {
                                                    const divKey = `${sport.sportId}-${division.divisionName}`;
                                                    const isDivExpanded = expandedDivisions.has(divKey);

                                                    return (
                                                        <div key={divKey} className="space-y-1">
                                                            <button
                                                                onClick={() => toggleDivision(divKey)}
                                                                className={`w-full flex items-center justify-between p-3 rounded-lg border ${config.borderColor} ${config.bgColor} ${config.hoverBg} transition-all`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    {isDivExpanded ? (
                                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                    )}
                                                                    <span className="font-semibold">{division.divisionName}</span>
                                                                </div>
                                                                <Badge className={config.color} variant="outline">
                                                                    {formatOneDecimal(division.totalMedals)}개
                                                                </Badge>
                                                            </button>

                                                            {/* 세부종목 레벨 */}
                                                            {isDivExpanded && (
                                                                <div className="ml-6 space-y-1">
                                                                    {division.events.map((event, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className={`flex items-center justify-between p-3 rounded-lg border ${config.borderColor} bg-background/50`}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-lg">{config.icon}</span>
                                                                                <span className="text-sm">{event.eventName}</span>
                                                                                {event.score.rank && (
                                                                                    <Badge variant="secondary" className="text-xs">
                                                                                        {event.score.rank}위
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                {event.score.total_score && event.score.total_score > 0 && (
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {formatOneDecimal(event.score.total_score)}점
                                                                                    </span>
                                                                                )}
                                                                                <Badge className={`${config.color} font-bold`} variant="secondary">
                                                                                    {formatOneDecimal(event.medals)}개
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
