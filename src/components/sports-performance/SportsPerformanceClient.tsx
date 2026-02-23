"use client";

import { useMemo, useState, Fragment } from "react";
import { Sport, Score, SportEvent } from "@/types";
import { BarChart3, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatOneDecimal } from "@/lib/number-format";

interface SportsPerformanceClientProps {
    scores: Score[];
    sports: Sport[];
    sportEvents: SportEvent[];
}

export function SportsPerformanceClient({ scores, sports, sportEvents }: SportsPerformanceClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set());

    // 종목별 (종별 포함) 통계
    const sportDivisionStats = useMemo(() => {
        const stats: Record<string, {
            sportId: string;
            sportName: string;
            division: string;
            actualScore: number;
            totalScore: number;
            gold: number;
            silver: number;
            bronze: number;
            eventDetails: Array<{
                eventId?: string;
                eventName: string;
                actualScore: number;
                totalScore: number;
                gold: number;
                silver: number;
                bronze: number;
                rank?: string;
            }>;
        }> = {};

        scores.forEach(score => {
            const key = `${score.sport_id}-${score.division}`;
            const sport = sports.find(s => s.id === score.sport_id);
            const sportEvent = score.sport_event_id
                ? sportEvents.find(e => e.id === score.sport_event_id)
                : undefined;

            if (!stats[key]) {
                stats[key] = {
                    sportId: score.sport_id,
                    sportName: sport?.name || score.sport_id,
                    division: score.division,
                    actualScore: 0,
                    totalScore: 0,
                    gold: 0,
                    silver: 0,
                    bronze: 0,
                    eventDetails: [],
                };
            }

            stats[key].actualScore += score.actual_score || 0;
            stats[key].totalScore += score.total_score || 0;
            stats[key].gold += score.gold || 0;
            stats[key].silver += score.silver || 0;
            stats[key].bronze += score.bronze || 0;

            // Add event detail if sport_event_id exists
            if (score.sport_event_id && sportEvent) {
                stats[key].eventDetails.push({
                    eventId: score.sport_event_id,
                    eventName: sportEvent.event_name,
                    actualScore: score.actual_score || 0,
                    totalScore: score.total_score || 0,
                    gold: score.gold || 0,
                    silver: score.silver || 0,
                    bronze: score.bronze || 0,
                    rank: score.rank,
                });
            }
        });

        return Object.values(stats).sort((a, b) => b.totalScore - a.totalScore);
    }, [scores, sports, sportEvents]);

    // 검색 필터링
    const filteredStats = useMemo(() => {
        if (!searchTerm.trim()) return sportDivisionStats;

        const term = searchTerm.toLowerCase();
        return sportDivisionStats.filter(stat => {
            // 종목명 검색
            if (stat.sportName.toLowerCase().includes(term)) return true;
            // 종별 검색
            if (stat.division.toLowerCase().includes(term)) return true;
            // 세부종목 검색
            if (stat.eventDetails.some(e => e.eventName.toLowerCase().includes(term))) return true;
            return false;
        });
    }, [sportDivisionStats, searchTerm]);

    // 필터링된 종목 그룹
    const filteredSportGroups = useMemo(() => {
        const groups: Record<string, typeof sportDivisionStats> = {};

        filteredStats.forEach(stat => {
            if (!groups[stat.sportId]) {
                groups[stat.sportId] = [];
            }
            groups[stat.sportId].push(stat);
        });

        return groups;
    }, [filteredStats]);

    const toggleSport = (sportId: string) => {
        const newExpanded = new Set(expandedSports);
        if (newExpanded.has(sportId)) {
            newExpanded.delete(sportId);
        } else {
            newExpanded.add(sportId);
        }
        setExpandedSports(newExpanded);
    };

    // 전체 확장/축소
    const expandAll = () => {
        setExpandedSports(new Set(Object.keys(filteredSportGroups)));
    };

    const collapseAll = () => {
        setExpandedSports(new Set());
    };

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="glass-card p-6 animate-fade-in-up">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold gradient-text">종목별 성적</h1>
                    <p className="text-muted-foreground">
                        경기도의 종목별 획득 성적 및 메달 현황을 확인하세요
                    </p>
                </div>
            </div>

            {/* 검색 및 필터 */}
            <div className="glass-card p-4 animate-fade-in-up space-y-3">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="종목, 종별, 세부종목으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={expandAll}
                            className="px-3 py-2 text-xs rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                        >
                            전체 펼치기
                        </button>
                        <button
                            onClick={collapseAll}
                            className="px-3 py-2 text-xs rounded-lg bg-secondary hover:bg-secondary/80 font-medium transition-colors"
                        >
                            전체 접기
                        </button>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    총 {Object.keys(filteredSportGroups).length}개 종목, {filteredStats.length}개 항목
                </div>
            </div>

            {/* 종목별 성적 테이블 */}
            <div className="glass-card p-6 animate-fade-in-up">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    종목별 획득성적 및 메달 현황
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border/50">
                                <th className="text-left p-3 font-semibold text-sm w-10"></th>
                                <th className="text-left p-3 font-semibold text-sm">종목</th>
                                <th className="text-left p-3 font-semibold text-sm">종별</th>
                                <th className="text-left p-3 font-semibold text-sm">세부종목</th>
                                <th className="text-right p-3 font-semibold text-sm">획득성적</th>
                                <th className="text-right p-3 font-semibold text-sm">총득점</th>
                                <th className="text-center p-3 font-semibold text-sm">금</th>
                                <th className="text-center p-3 font-semibold text-sm">은</th>
                                <th className="text-center p-3 font-semibold text-sm">동</th>
                                <th className="text-center p-3 font-semibold text-sm">순위</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(filteredSportGroups).map(([sportId, divisions]) => {
                                const isExpanded = expandedSports.has(sportId);
                                const sportName = divisions[0]?.sportName || sportId;

                                // 종목 전체 합계
                                const sportTotal = divisions.reduce((acc, div) => ({
                                    actualScore: acc.actualScore + div.actualScore,
                                    totalScore: acc.totalScore + div.totalScore,
                                    gold: acc.gold + div.gold,
                                    silver: acc.silver + div.silver,
                                    bronze: acc.bronze + div.bronze,
                                }), { actualScore: 0, totalScore: 0, gold: 0, silver: 0, bronze: 0 });

                                return (
                                    <Fragment key={sportId}>
                                        {/* 종목 헤더 행 */}
                                        <tr
                                            className="bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer border-b border-border/30"
                                            onClick={() => toggleSport(sportId)}
                                        >
                                            <td className="p-3">
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </td>
                                            <td className="p-3 font-bold text-primary" colSpan={3}>
                                                {sportName} ({divisions.length}개 종별)
                                            </td>
                                            <td className="p-3 text-right font-bold text-blue-600">
                                                {formatOneDecimal(sportTotal.actualScore)}
                                            </td>
                                            <td className="p-3 text-right font-bold">
                                                {formatOneDecimal(sportTotal.totalScore)}
                                            </td>
                                            <td className="p-3 text-center font-bold medal-gold">
                                                {formatOneDecimal(sportTotal.gold)}
                                            </td>
                                            <td className="p-3 text-center font-bold medal-silver">
                                                {formatOneDecimal(sportTotal.silver)}
                                            </td>
                                            <td className="p-3 text-center font-bold medal-bronze">
                                                {formatOneDecimal(sportTotal.bronze)}
                                            </td>
                                            <td className="p-3"></td>
                                        </tr>

                                        {/* 종별 및 세부종목 행 */}
                                        {isExpanded && divisions.map((stat) => (
                                            <Fragment key={`${stat.sportId}-${stat.division}`}>
                                                {/* 종별 합계 행 */}
                                                <tr className="bg-accent/30 border-b border-border/20">
                                                    <td className="p-3"></td>
                                                    <td className="p-3"></td>
                                                    <td className="p-3">
                                                        <span className="px-2 py-1 rounded-full text-xs bg-primary/20 text-primary font-semibold">
                                                            {stat.division}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-sm text-muted-foreground font-medium">
                                                        {stat.eventDetails.length > 0 ? `${stat.eventDetails.length}개 세부종목` : '세부종목 없음'}
                                                    </td>
                                                    <td className="p-3 text-right font-semibold text-blue-600">
                                                        {formatOneDecimal(stat.actualScore)}
                                                    </td>
                                                    <td className="p-3 text-right font-bold">
                                                        {formatOneDecimal(stat.totalScore)}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {stat.gold > 0 && (
                                                            <span className="font-bold medal-gold">{formatOneDecimal(stat.gold)}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {stat.silver > 0 && (
                                                            <span className="font-bold medal-silver">{formatOneDecimal(stat.silver)}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {stat.bronze > 0 && (
                                                            <span className="font-bold medal-bronze">{formatOneDecimal(stat.bronze)}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center text-xs text-muted-foreground">
                                                        {stat.eventDetails.length > 0 ? '세부종목별' : '-'}
                                                    </td>
                                                </tr>

                                                {/* 세부종목 행들 */}
                                                {stat.eventDetails.map((event, eventIndex) => (
                                                    <tr
                                                        key={`${stat.sportId}-${stat.division}-${event.eventId || eventIndex}`}
                                                        className="border-b border-border/10 hover:bg-accent/20 transition-colors"
                                                    >
                                                        <td className="p-3"></td>
                                                        <td className="p-3"></td>
                                                        <td className="p-3"></td>
                                                        <td className="p-3 pl-6">
                                                            <span className="text-sm text-muted-foreground">
                                                                └ {event.eventName}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right text-sm text-blue-600">
                                                            {formatOneDecimal(event.actualScore)}
                                                        </td>
                                                        <td className="p-3 text-right text-sm font-semibold">
                                                            {formatOneDecimal(event.totalScore)}
                                                        </td>
                                                        <td className="p-3 text-center text-sm">
                                                            {event.gold > 0 && (
                                                                <span className="medal-gold">{formatOneDecimal(event.gold)}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center text-sm">
                                                            {event.silver > 0 && (
                                                                <span className="medal-silver">{formatOneDecimal(event.silver)}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center text-sm">
                                                            {event.bronze > 0 && (
                                                                <span className="medal-bronze">{formatOneDecimal(event.bronze)}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {event.rank && (
                                                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                                                    Number(event.rank) <= 3
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : Number(event.rank) <= 8
                                                                            ? 'bg-blue-100 text-blue-700'
                                                                            : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                    {event.rank}위
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-primary/10 font-bold border-t-2 border-primary/20">
                                <td className="p-3" colSpan={4}>전체 합계</td>
                                <td className="p-3 text-right text-blue-600">
                                    {formatOneDecimal(filteredStats.reduce((sum, s) => sum + s.actualScore, 0))}
                                </td>
                                <td className="p-3 text-right">
                                    {formatOneDecimal(filteredStats.reduce((sum, s) => sum + s.totalScore, 0))}
                                </td>
                                <td className="p-3 text-center medal-gold">
                                    {formatOneDecimal(filteredStats.reduce((sum, s) => sum + s.gold, 0))}
                                </td>
                                <td className="p-3 text-center medal-silver">
                                    {formatOneDecimal(filteredStats.reduce((sum, s) => sum + s.silver, 0))}
                                </td>
                                <td className="p-3 text-center medal-bronze">
                                    {formatOneDecimal(filteredStats.reduce((sum, s) => sum + s.bronze, 0))}
                                </td>
                                <td className="p-3"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
