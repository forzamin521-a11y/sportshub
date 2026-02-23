"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Region, Score, Sport } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { GYEONGGI_REGION_ID, DIVISION_LIST } from "@/lib/constants";
import { requestJson } from "@/lib/api-client";

interface ScoreWithDetails extends Score {
    region_name: string;
}

export default function SportsAnalysisPage() {
    const [sports, setSports] = useState<Sport[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("전체");
    const [selectedSportId, setSelectedSportId] = useState<string>("");
    const [selectedDivision, setSelectedDivision] = useState<string>("전체");
    const [allScores, setAllScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const data = await requestJson<{
                    data: {
                        regions: Region[];
                        sports: Sport[];
                        scores: Score[];
                    };
                }>("/api/admin/dashboard-data");

                const fetchedSports = data.data.sports || [];
                setSports(fetchedSports);
                setRegions(data.data.regions || []);
                setAllScores(data.data.scores || []);
                if (fetchedSports.length > 0) {
                    setSelectedSportId(fetchedSports[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const scoresForSport: ScoreWithDetails[] = useMemo(() => {
        if (!selectedSportId) return [];
        return allScores
            .filter((score) => score.sport_id === selectedSportId)
            .map((score) => ({
                ...score,
                region_name: regions.find((r) => r.id === score.region_id)?.name || score.region_id,
            }));
    }, [allScores, regions, selectedSportId]);

    // 카테고리별로 종목 필터링
    const filteredSports = selectedCategory === "전체"
        ? sports
        : sports.filter(s => s.category === selectedCategory);

    const selectedSport = sports.find(s => s.id === selectedSportId);

    // 종별 필터링
    const filteredScores = selectedDivision === "전체"
        ? scoresForSport
        : scoresForSport.filter(s => s.division === selectedDivision);

    // 차트 데이터 (상위 10개 시도)
    const chartData = filteredScores
        .sort((a, b) => (b.actual_score || 0) - (a.actual_score || 0))
        .slice(0, 10)
        .map(score => ({
            name: score.region_name.length > 6 ? score.region_name.substring(0, 6) : score.region_name,
            점수: score.actual_score || 0,
            메달: (score.gold || 0) * 3 + (score.silver || 0) * 2 + (score.bronze || 0),
        }));

    // 총 메달 수
    const totalGold = filteredScores.reduce((sum, s) => sum + (s.gold || 0), 0);
    const totalSilver = filteredScores.reduce((sum, s) => sum + (s.silver || 0), 0);
    const totalBronze = filteredScores.reduce((sum, s) => sum + (s.bronze || 0), 0);

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">경기도 종목별 분석</h1>
                    <p className="text-muted-foreground mt-2">
                        경기도의 종목별 성적과 다른 시도와의 비교를 분석합니다.
                    </p>
                </div>

                {/* 카테고리 필터 */}
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                    <TabsList>
                        <TabsTrigger value="전체">전체</TabsTrigger>
                        <TabsTrigger value="구기">구기</TabsTrigger>
                        <TabsTrigger value="무도">무도</TabsTrigger>
                        <TabsTrigger value="기타">기타</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* 종목 및 종별 선택 */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">종목:</label>
                        <Select value={selectedSportId} onValueChange={setSelectedSportId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="종목 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredSports.map((sport) => (
                                    <SelectItem key={sport.id} value={sport.id}>
                                        {sport.name} {sport.sub_name && `(${sport.sub_name})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">종별:</label>
                        <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="종별 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="전체">전체</SelectItem>
                                {DIVISION_LIST.map((division) => (
                                    <SelectItem key={division} value={division}>
                                        {division}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 요약 카드 */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">카테고리</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{selectedSport?.category || '-'}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">금메달</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-500">{totalGold}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">은메달</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-400">{totalSilver}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">동메달</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{totalBronze}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 시도별 점수 비교 차트 */}
                <Card>
                    <CardHeader>
                        <CardTitle>시도별 점수 비교 (상위 10개)</CardTitle>
                        <CardDescription>
                            {selectedSport?.name}의 시도별 점수 및 메달 가중치를 비교합니다.
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
                                    <Bar dataKey="점수" fill="#3b82f6" />
                                    <Bar dataKey="메달" fill="#f59e0b" />
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
                        <CardTitle>시도별 상세 데이터</CardTitle>
                        <CardDescription>
                            {selectedSport?.name}의 전체 시도 성적입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : scoresForSport.length > 0 ? (
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-3 text-left font-medium">시도</th>
                                            <th className="p-3 text-center font-medium">종별</th>
                                            <th className="p-3 text-center font-medium">예상점수</th>
                                            <th className="p-3 text-center font-medium">실제점수</th>
                                            <th className="p-3 text-center font-medium">금</th>
                                            <th className="p-3 text-center font-medium">은</th>
                                            <th className="p-3 text-center font-medium">동</th>
                                            <th className="p-3 text-center font-medium">순위</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredScores
                                            .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999))
                                            .map((score, index) => (
                                                <tr key={score.id || index} className={`border-b ${score.region_id === GYEONGGI_REGION_ID ? 'bg-blue-50 font-semibold' : ''}`}>
                                                    <td className="p-3 font-medium">{score.region_name}</td>
                                                    <td className="p-3 text-center">{score.division}</td>
                                                    <td className="p-3 text-center">{score.expected_score?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '-'}</td>
                                                    <td className="p-3 text-center font-semibold text-blue-600">
                                                        {score.actual_score?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '-'}
                                                    </td>
                                                    <td className="p-3 text-center">{score.gold || '-'}</td>
                                                    <td className="p-3 text-center">{score.silver || '-'}</td>
                                                    <td className="p-3 text-center">{score.bronze || '-'}</td>
                                                    <td className="p-3 text-center font-semibold">
                                                        {score.rank ? `${score.rank}위` : '-'}
                                                    </td>
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
