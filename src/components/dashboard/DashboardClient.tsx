"use client";

import { useMemo, useState } from "react";
import { Score, Region, Sport, SportEvent } from "@/types";
import { GYEONGGI_REGION_ID } from "@/lib/constants";
import { Trophy, Medal, TrendingUp, Target, BarChart3, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MedalistDialog } from "@/components/dashboard/MedalistDialog";
import { formatMedalCount, formatOneDecimal } from "@/lib/number-format";

interface DashboardClientProps {
    scores: Score[];
    regions: Region[];
    sports: Sport[];
    sportEvents: SportEvent[];
}

export function DashboardClient({ scores, regions, sports, sportEvents }: DashboardClientProps) {
    const [medalDialogOpen, setMedalDialogOpen] = useState(false);
    const [selectedMedalType, setSelectedMedalType] = useState<'gold' | 'silver' | 'bronze'>('gold');

    // 경기도 데이터만 필터링
    const gyeonggiScores = useMemo(() =>
        scores.filter(s => s.region_id === GYEONGGI_REGION_ID),
        [scores]
    );

    const openMedalDialog = (type: 'gold' | 'silver' | 'bronze') => {
        setSelectedMedalType(type);
        setMedalDialogOpen(true);
    };

    // 전체 통계 계산
    const totalStats = useMemo(() => {
        const totalExpected = gyeonggiScores.reduce((sum, s) => sum + (s.expected_score || 0), 0);
        const totalActual = gyeonggiScores.reduce((sum, s) => sum + (s.actual_score || 0), 0);
        const totalScore = gyeonggiScores.reduce((sum, s) => sum + (s.total_score || 0), 0);
        const gold = gyeonggiScores.reduce((sum, s) => sum + (s.gold || 0), 0);
        const silver = gyeonggiScores.reduce((sum, s) => sum + (s.silver || 0), 0);
        const bronze = gyeonggiScores.reduce((sum, s) => sum + (s.bronze || 0), 0);
        const achievementRate = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0;

        return { totalExpected, totalActual, totalScore, gold, silver, bronze, achievementRate };
    }, [gyeonggiScores]);

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

    const gyeonggiRank = regionTotals.findIndex(r => r.id === GYEONGGI_REGION_ID) + 1;

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="glass-card p-6 animate-fade-in-up">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">경기도 성적 대시보드</h1>
                        <p className="text-muted-foreground mt-1">
                            제106회 전국체육대회 실시간 성적 현황
                        </p>
                    </div>
                    <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
                        <Trophy className="h-5 w-5 text-primary" />
                        <span className="font-semibold">현재 순위: </span>
                        <span className="text-2xl font-bold text-primary">{gyeonggiRank}위</span>
                        <span className="text-muted-foreground">/ {regionTotals.length}개 시도</span>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="glass-card p-4 stat-card-blue animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">총 득점</p>
                            <p className="text-xl font-bold">{formatOneDecimal(totalStats.totalScore)}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 stat-card-green animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">달성률</p>
                            <p className="text-xl font-bold">{formatOneDecimal(totalStats.achievementRate)}%</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => openMedalDialog('gold')}
                    className="glass-card p-4 animate-fade-in-up hover:bg-yellow-500/10 transition-all cursor-pointer"
                    style={{ animationDelay: '0.2s' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-500/20">
                            <Medal className="h-5 w-5 medal-gold" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">금메달</p>
                            <p className="text-xl font-bold medal-gold">{formatMedalCount(totalStats.gold)}개</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => openMedalDialog('silver')}
                    className="glass-card p-4 animate-fade-in-up hover:bg-gray-400/10 transition-all cursor-pointer"
                    style={{ animationDelay: '0.25s' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-400/20">
                            <Medal className="h-5 w-5 medal-silver" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">은메달</p>
                            <p className="text-xl font-bold medal-silver">{formatMedalCount(totalStats.silver)}개</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => openMedalDialog('bronze')}
                    className="glass-card p-4 animate-fade-in-up hover:bg-orange-500/10 transition-all cursor-pointer"
                    style={{ animationDelay: '0.3s' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                            <Medal className="h-5 w-5 medal-bronze" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">동메달</p>
                            <p className="text-xl font-bold medal-bronze">{formatMedalCount(totalStats.bronze)}개</p>
                        </div>
                    </div>
                </button>

                <div className="glass-card p-4 stat-card-purple animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Medal className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">총 메달</p>
                            <p className="text-xl font-bold">{formatMedalCount(totalStats.gold + totalStats.silver + totalStats.bronze)}개</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid md:grid-cols-2 gap-4">
                <Link href="/sports-performance" className="block">
                    <div className="glass-card p-6 hover:bg-accent/30 transition-all cursor-pointer group animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <BarChart3 className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">종목별 성적</h3>
                                    <p className="text-sm text-muted-foreground">
                                        종목별 상세 성적 및 메달 현황
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="mt-4 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">총점:</span>
                                <span className="font-semibold text-primary">{formatOneDecimal(totalStats.totalScore)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Medal className="h-3.5 w-3.5 medal-gold" />
                                <span className="font-semibold medal-gold">{formatMedalCount(totalStats.gold)}개</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Medal className="h-3.5 w-3.5 medal-silver" />
                                <span className="font-semibold medal-silver">{formatMedalCount(totalStats.silver)}개</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Medal className="h-3.5 w-3.5 medal-bronze" />
                                <span className="font-semibold medal-bronze">{formatMedalCount(totalStats.bronze)}개</span>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/region-comparison" className="block">
                    <div className="glass-card p-6 hover:bg-accent/30 transition-all cursor-pointer group animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">시도별 비교</h3>
                                    <p className="text-sm text-muted-foreground">
                                        전국 시도별 순위 및 비교 분석
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="mt-4 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <Trophy className="h-3.5 w-3.5 text-primary" />
                                <span className="text-muted-foreground">경기도 순위:</span>
                                <span className="font-bold text-primary text-lg">{gyeonggiRank}위</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">참가 시도:</span>
                                <span className="font-semibold">{regionTotals.length}개</span>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Top 5 Regions Preview */}
            <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        상위 5개 시도
                    </h2>
                    <Link href="/region-comparison">
                        <Button variant="ghost" size="sm" className="text-xs">
                            전체 보기
                            <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </Link>
                </div>
                <div className="grid gap-2">
                    {regionTotals.slice(0, 5).map((region, index) => (
                        <div
                            key={region.id}
                            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                region.isGyeonggi
                                    ? 'bg-primary/10 border border-primary/20'
                                    : 'bg-accent/30 hover:bg-accent/50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
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
                                <span className={`font-medium ${region.isGyeonggi ? 'text-primary font-bold' : ''}`}>
                                    {region.name}
                                    {region.isGyeonggi && (
                                        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                            우리 시도
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">총득점</div>
                                    <div className="font-bold text-lg">{formatOneDecimal(region.totalScore)}</div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="medal-gold font-semibold">{formatMedalCount(region.gold)}개</span>
                                    <span className="medal-silver font-semibold">{formatMedalCount(region.silver)}개</span>
                                    <span className="medal-bronze font-semibold">{formatMedalCount(region.bronze)}개</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Medal Dialog */}
            <MedalistDialog
                open={medalDialogOpen}
                onOpenChange={setMedalDialogOpen}
                medalType={selectedMedalType}
                scores={scores}
                regionId={GYEONGGI_REGION_ID}
                sports={sports}
                sportEvents={sportEvents}
            />
        </div>
    );
}
