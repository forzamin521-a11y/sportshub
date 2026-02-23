"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Region, Score, Sport } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface ScoreWithDetails extends Score {
    sport_name: string;
}

export default function RegionsAnalysisPage() {
    const [regions, setRegions] = useState<Region[]>([]);
    const [selectedRegionId, setSelectedRegionId] = useState<string>("");
    const [scores, setScores] = useState<ScoreWithDetails[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [loading, setLoading] = useState(false);

    // 시도 목록 가져오기
    useEffect(() => {
        async function fetchRegions() {
            try {
                const res = await fetch("/api/regions");
                const data = await res.json();
                setRegions(data.data || []);
                if (data.data && data.data.length > 0) {
                    setSelectedRegionId(data.data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch regions:", error);
            }
        }
        fetchRegions();
    }, []);

    // 종목 목록 가져오기
    useEffect(() => {
        async function fetchSports() {
            try {
                const res = await fetch("/api/sports");
                const data = await res.json();
                setSports(data.data || []);
            } catch (error) {
                console.error("Failed to fetch sports:", error);
            }
        }
        fetchSports();
    }, []);

    // 선택한 시도의 점수 데이터 가져오기
    useEffect(() => {
        if (!selectedRegionId) return;

        async function fetchScores() {
            setLoading(true);
            try {
                const res = await fetch(`/api/scores?region_id=${selectedRegionId}`);
                const data = await res.json();

                // 종목명 매핑
                const scoresWithNames = (data.data || []).map((score: Score) => ({
                    ...score,
                    sport_name: sports.find(s => s.id === score.sport_id)?.name || score.sport_id,
                }));

                setScores(scoresWithNames);
            } catch (error) {
                console.error("Failed to fetch scores:", error);
            } finally {
                setLoading(false);
            }
        }

        if (sports.length > 0) {
            fetchScores();
        }
    }, [selectedRegionId, sports]);

    const selectedRegion = regions.find(r => r.id === selectedRegionId);

    // 총점 계산
    const totalExpected = scores.reduce((sum, s) => sum + (s.expected_score || 0), 0);
    const totalActual = scores.reduce((sum, s) => sum + (s.actual_score || 0), 0);
    const totalMedals = scores.reduce((sum, s) => sum + (s.gold || 0) + (s.silver || 0) + (s.bronze || 0), 0);

    // 차트 데이터 (상위 10개 종목)
    const chartData = scores
        .slice(0, 10)
        .map(score => ({
            name: score.sport_name.length > 8 ? score.sport_name.substring(0, 8) + '...' : score.sport_name,
            예상점수: score.expected_score || 0,
            실제점수: score.actual_score || 0,
        }));

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">시도별 분석</h1>
                        <p className="text-muted-foreground mt-2">
                            특정 시도의 상세 성과를 분석합니다.
                        </p>
                    </div>

                    <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="시도 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {regions.map((region) => (
                                <SelectItem key={region.id} value={region.id}>
                                    {region.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 요약 카드 */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">예상 총점</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalExpected.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                            <p className="text-xs text-muted-foreground mt-1">점</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">실제 총점</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{totalActual.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {totalExpected > 0 ? `달성률: ${((totalActual / totalExpected) * 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : ''}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">총 메달 수</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{totalMedals.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                            <p className="text-xs text-muted-foreground mt-1">개</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 예상 vs 실제 득점 비교 차트 */}
                <Card>
                    <CardHeader>
                        <CardTitle>예상 vs 실제 득점 비교 (상위 10개 종목)</CardTitle>
                        <CardDescription>
                            {selectedRegion?.name}의 종목별 예상 점수와 실제 점수를 비교합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center h-[400px]">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="예상점수" fill="#94a3b8" />
                                    <Bar dataKey="실제점수" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                                데이터가 없습니다.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 상세 데이터 테이블 */}
                <Card>
                    <CardHeader>
                        <CardTitle>종목별 상세 데이터</CardTitle>
                        <CardDescription>
                            {selectedRegion?.name}의 전체 종목 성적입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : scores.length > 0 ? (
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-3 text-left font-medium">종목</th>
                                            <th className="p-3 text-center font-medium">예상점수</th>
                                            <th className="p-3 text-center font-medium">실제점수</th>
                                            <th className="p-3 text-center font-medium">금</th>
                                            <th className="p-3 text-center font-medium">은</th>
                                            <th className="p-3 text-center font-medium">동</th>
                                            <th className="p-3 text-center font-medium">순위</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scores.map((score, index) => (
                                            <tr key={score.id || index} className="border-b">
                                                <td className="p-3">{score.sport_name}</td>
                                                <td className="p-3 text-center">{score.expected_score?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '-'}</td>
                                                <td className="p-3 text-center font-semibold text-blue-600">
                                                    {score.actual_score?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '-'}
                                                </td>
                                                <td className="p-3 text-center">{score.gold || '-'}</td>
                                                <td className="p-3 text-center">{score.silver || '-'}</td>
                                                <td className="p-3 text-center">{score.bronze || '-'}</td>
                                                <td className="p-3 text-center">{score.rank || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                                데이터가 없습니다.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
