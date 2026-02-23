"use client";

import { useMemo, useState, Fragment } from "react";
import { Sport, Score, Region } from "@/types";
import { GYEONGGI_REGION_ID } from "@/lib/constants";
import { Users, BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { formatOneDecimal } from "@/lib/number-format";

interface RegionComparisonClientProps {
    scores: Score[];
    sports: Sport[];
    regions: Region[];
}

export function RegionComparisonClient({ scores, sports, regions }: RegionComparisonClientProps) {
    const [expandedSports, setExpandedSports] = useState<Set<string>>(new Set());
    const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

    const toggleSport = (sportId: string) => {
        const newExpanded = new Set(expandedSports);
        if (newExpanded.has(sportId)) {
            newExpanded.delete(sportId);
        } else {
            newExpanded.add(sportId);
        }
        setExpandedSports(newExpanded);
    };

    const toggleDivision = (sportId: string, division: string) => {
        const key = `${sportId}-${division}`;
        const newExpanded = new Set(expandedDivisions);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedDivisions(newExpanded);
    };

    // 시도별 총점 순위
    const regionTotals = useMemo(() => {
        const totals = regions.map(region => {
            const regionScores = scores.filter(s => s.region_id === region.id);
            return {
                id: region.id,
                name: region.name,
                totalScore: regionScores.reduce((sum, s) => sum + (s.total_score || 0), 0),
                gold: regionScores.reduce((sum, s) => sum + (s.gold || 0), 0),
                silver: regionScores.reduce((sum, s) => sum + (s.silver || 0), 0),
                bronze: regionScores.reduce((sum, s) => sum + (s.bronze || 0), 0),
                isGyeonggi: region.id === GYEONGGI_REGION_ID,
            };
        });
        return totals.sort((a, b) => b.totalScore - a.totalScore);
    }, [scores, regions]);

    // 종목별로 그룹화된 통계 (전체 시도 기반으로 구조 생성)
    const sportStats = useMemo(() => {
        const statsBySport: Record<string, {
            sportId: string;
            sportName: string;
            totalScore: number;
            divisions: Array<{
                division: string;
                totalScore: number;
                events: Array<{
                    eventId: string;
                    eventName: string;
                }>;
            }>;
        }> = {};

        // 전체 scores에서 종목/종별/세부종목 구조를 빌드
        scores.forEach(score => {
            const sport = sports.find(s => s.id === score.sport_id);
            const sportName = sport?.name || score.sport_id;

            if (!statsBySport[score.sport_id]) {
                statsBySport[score.sport_id] = {
                    sportId: score.sport_id,
                    sportName,
                    totalScore: 0,
                    divisions: [],
                };
            }

            // 종별 찾기 또는 생성
            let divisionStat = statsBySport[score.sport_id].divisions.find(d => d.division === score.division);
            if (!divisionStat) {
                divisionStat = {
                    division: score.division,
                    totalScore: 0,
                    events: [],
                };
                statsBySport[score.sport_id].divisions.push(divisionStat);
            }

            // 세부종목 찾기 또는 생성
            if (score.sport_event_id) {
                let eventStat = divisionStat.events.find(e => e.eventId === score.sport_event_id);
                if (!eventStat) {
                    eventStat = {
                        eventId: score.sport_event_id,
                        eventName: score.sport_event_id.split('-').pop() || score.sport_event_id,
                    };
                    divisionStat.events.push(eventStat);
                }
            }

            // 전체 총점 합산 (정렬용)
            statsBySport[score.sport_id].totalScore += score.total_score || 0;
            divisionStat.totalScore += score.total_score || 0;
        });

        // 정렬
        const sortedStats = Object.values(statsBySport).sort((a, b) => b.totalScore - a.totalScore);
        sortedStats.forEach(sport => {
            sport.divisions.sort((a, b) => b.totalScore - a.totalScore);
        });

        return sortedStats;
    }, [scores, sports]);

    // 시도별 비교 (종목별, 종별 포함)
    const regionComparisonData = useMemo(() => {
        // 각 시도별로 종목-종별 데이터를 집계
        const data: Record<string, Record<string, {
            actualScore: number;
            totalScore: number;
            gold: number;
            silver: number;
            bronze: number;
        }>> = {};

        // 모든 시도 초기화
        regions.forEach(region => {
            data[region.id] = {};
        });

        // 점수 데이터 집계
        scores.forEach(score => {
            const key = `${score.sport_id}-${score.division}`;
            if (!data[score.region_id]) {
                data[score.region_id] = {};
            }
            if (!data[score.region_id][key]) {
                data[score.region_id][key] = {
                    actualScore: 0,
                    totalScore: 0,
                    gold: 0,
                    silver: 0,
                    bronze: 0,
                };
            }
            data[score.region_id][key].actualScore += score.actual_score || 0;
            data[score.region_id][key].totalScore += score.total_score || 0;
            data[score.region_id][key].gold += score.gold || 0;
            data[score.region_id][key].silver += score.silver || 0;
            data[score.region_id][key].bronze += score.bronze || 0;
        });

        return data;
    }, [scores, regions]);

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="glass-card p-6 animate-fade-in-up">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold gradient-text">시도별 비교</h1>
                    <p className="text-muted-foreground">
                        전국 시도별 성적을 비교하고 경기도의 위치를 확인하세요
                    </p>
                </div>
            </div>

            {/* 시도별 종합 순위 */}
            <div className="glass-card p-6 animate-fade-in-up">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    시도별 종합 순위
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border/50">
                                <th className="text-left p-3 font-semibold text-sm">순위</th>
                                <th className="text-left p-3 font-semibold text-sm">시도</th>
                                <th className="text-right p-3 font-semibold text-sm">총득점</th>
                                <th className="text-center p-3 font-semibold text-sm">금</th>
                                <th className="text-center p-3 font-semibold text-sm">은</th>
                                <th className="text-center p-3 font-semibold text-sm">동</th>
                                <th className="text-center p-3 font-semibold text-sm">총 메달</th>
                            </tr>
                        </thead>
                        <tbody>
                            {regionTotals.map((region, index) => (
                                <tr
                                    key={region.id}
                                    className={`border-b border-border/30 transition-colors ${
                                        region.isGyeonggi
                                            ? 'bg-primary/10 hover:bg-primary/15'
                                            : 'hover:bg-accent/30'
                                    }`}
                                >
                                    <td className="p-3">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                            index === 0
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : index === 1
                                                    ? 'bg-gray-200 text-gray-700'
                                                    : index === 2
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-secondary text-secondary-foreground'
                                        }`}>
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`font-medium ${region.isGyeonggi ? 'text-primary font-bold' : ''}`}>
                                            {region.name}
                                            {region.isGyeonggi && (
                                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                                    우리 시도
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-bold text-lg">
                                        {formatOneDecimal(region.totalScore)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="font-bold medal-gold">{formatOneDecimal(region.gold)}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="font-bold medal-silver">{formatOneDecimal(region.silver)}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="font-bold medal-bronze">{formatOneDecimal(region.bronze)}</span>
                                    </td>
                                    <td className="p-3 text-center font-semibold">
                                        {formatOneDecimal(region.gold + region.silver + region.bronze)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 종목별 시도 비교 */}
            <div className="glass-card p-6 animate-fade-in-up">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    종목별 시도 비교
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/50">
                                <th className="text-left p-2 font-semibold sticky left-0 bg-card z-10 min-w-[180px]">종목</th>
                                <th className="text-left p-2 font-semibold min-w-[80px]">종별</th>
                                {regionTotals.slice(0, 8).map(region => (
                                    <th
                                        key={region.id}
                                        className={`text-center p-2 font-semibold min-w-[80px] ${
                                            region.isGyeonggi ? 'bg-primary/10' : ''
                                        }`}
                                    >
                                        {region.name.replace('특별', '').replace('광역', '').replace('자치', '').slice(0, 2)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sportStats.slice(0, 20).map((sport) => {
                                const isExpanded = expandedSports.has(sport.sportId);
                                return (
                                    <Fragment key={sport.sportId}>
                                        {/* 종목 헤더 */}
                                        <tr
                                            className="border-b border-border/50 bg-accent/20 hover:bg-accent/30 cursor-pointer"
                                            onClick={() => toggleSport(sport.sportId)}
                                        >
                                            <td className="p-3 font-semibold sticky left-0 bg-accent/20 z-10">
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    {sport.sportName}
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        ({sport.divisions.length}개 종별)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3 bg-accent/20">
                                                <span className="text-xs text-muted-foreground">전체</span>
                                            </td>
                                            {regionTotals.slice(0, 8).map(region => {
                                                // 해당 종목의 모든 종별 합계
                                                let totalScore = 0;
                                                let totalGold = 0;
                                                sport.divisions.forEach(div => {
                                                    const key = `${sport.sportId}-${div.division}`;
                                                    const regionData = regionComparisonData[region.id]?.[key];
                                                    totalScore += regionData?.totalScore || 0;
                                                    totalGold += regionData?.gold || 0;
                                                });
                                                return (
                                                    <td
                                                        key={region.id}
                                                        className={`p-3 text-center font-semibold bg-accent/20 ${
                                                            region.isGyeonggi ? 'bg-primary/10 text-primary' : ''
                                                        }`}
                                                    >
                                                        {totalScore > 0 ? (
                                                            <div>
                                                                <div>{totalScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                                                                {totalGold > 0 && (
                                                                    <div className="text-xs medal-gold">
                                                                        {totalGold}금
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        {/* 종별 행들 */}
                                        {isExpanded && sport.divisions.map((div) => {
                                            const divKey = `${sport.sportId}-${div.division}`;
                                            const isDivExpanded = expandedDivisions.has(divKey);
                                            return (
                                                <Fragment key={divKey}>
                                                    {/* 종별 헤더 */}
                                                    <tr
                                                        className="border-b border-border/30 hover:bg-accent/10 cursor-pointer bg-accent/5"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleDivision(sport.sportId, div.division);
                                                        }}
                                                    >
                                                        <td className="p-2 pl-10 sticky left-0 bg-accent/5 z-10">
                                                            <div className="flex items-center gap-2">
                                                                {isDivExpanded ? (
                                                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                                ) : (
                                                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                                )}
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({div.events.length}개 세부종목)
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-2 bg-accent/5">
                                                            <span className="px-1.5 py-0.5 rounded text-xs bg-secondary font-medium">
                                                                {div.division}
                                                            </span>
                                                        </td>
                                                        {regionTotals.slice(0, 8).map(region => {
                                                            const regionData = regionComparisonData[region.id]?.[divKey];
                                                            const score = regionData?.totalScore || 0;
                                                            const gold = regionData?.gold || 0;
                                                            return (
                                                                <td
                                                                    key={region.id}
                                                                    className={`p-2 text-center bg-accent/5 ${
                                                                        region.isGyeonggi ? 'bg-primary/10 font-semibold' : ''
                                                                    }`}
                                                                >
                                                                    {score > 0 ? (
                                                                        <div>
                                                                            <div className={region.isGyeonggi ? 'text-primary' : ''}>
                                                                                {score.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                                            </div>
                                                                            {gold > 0 && (
                                                                                <div className="text-xs medal-gold">
                                                                                    {gold}금
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                    {/* 세부종목 행들 */}
                                                    {isDivExpanded && div.events.map((event) => {
                                                        return (
                                                            <tr key={event.eventId} className="border-b border-border/20 hover:bg-accent/5">
                                                                <td className="p-2 pl-16 sticky left-0 bg-card z-10 text-xs text-muted-foreground">
                                                                    {event.eventName}
                                                                </td>
                                                                <td className="p-2">
                                                                    {/* 빈 공간 */}
                                                                </td>
                                                                {regionTotals.slice(0, 8).map(region => {
                                                                    // 세부종목별 점수 찾기
                                                                    const eventScores = scores.filter(s =>
                                                                        s.region_id === region.id &&
                                                                        s.sport_event_id === event.eventId
                                                                    );
                                                                    const score = eventScores.reduce((sum, s) => sum + (s.total_score || 0), 0);
                                                                    const gold = eventScores.reduce((sum, s) => sum + (s.gold || 0), 0);
                                                                    return (
                                                                        <td
                                                                            key={region.id}
                                                                            className={`p-2 text-center text-xs ${
                                                                                region.isGyeonggi ? 'bg-primary/5' : ''
                                                                            }`}
                                                                        >
                                                                            {score > 0 ? (
                                                                                <div>
                                                                                    <div className={region.isGyeonggi ? 'text-primary' : ''}>
                                                                                        {score.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                                                    </div>
                                                                                    {gold > 0 && (
                                                                                        <div className="text-xs medal-gold">
                                                                                            {gold}금
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-muted-foreground">-</span>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </Fragment>
                                            );
                                        })}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                    * 상위 8개 시도, 상위 20개 종목만 표시됩니다. 종목을 클릭하면 종별 상세를 볼 수 있습니다.
                </p>
            </div>
        </div>
    );
}
