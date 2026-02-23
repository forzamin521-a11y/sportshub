"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Region, Score, Sport } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { GYEONGGI_REGION_ID, DIVISION_LIST } from "@/lib/constants";
import { requestJson } from "@/lib/api-client";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function CategoriesAnalysisPage() {
    const [regions, setRegions] = useState<Region[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);

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

                setRegions(data.data.regions || []);
                setSports(data.data.sports || []);
                setScores(data.data.scores || []);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // 경기도 점수만 필터링
    const gyeonggiScores = scores.filter(s => s.region_id === GYEONGGI_REGION_ID);

    // 종별(division)별 집계
    const divisionStats = DIVISION_LIST.map(division => {
        const divisionScores = gyeonggiScores.filter(s => s.division === division);

        const totalScore = divisionScores.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0);
        const totalExpected = divisionScores.reduce((sum, s) => sum + (Number(s.expected_score) || 0), 0);
        const totalActual = divisionScores.reduce((sum, s) => sum + (Number(s.actual_score) || 0), 0);
        const gold = divisionScores.reduce((sum, s) => sum + (Number(s.gold) || 0), 0);
        const silver = divisionScores.reduce((sum, s) => sum + (Number(s.silver) || 0), 0);
        const bronze = divisionScores.reduce((sum, s) => sum + (Number(s.bronze) || 0), 0);

        return {
            division,
            totalScore,
            totalExpected,
            totalActual,
            gold,
            silver,
            bronze,
            count: divisionScores.length,
        };
    }).filter(stat => stat.count > 0); // 데이터가 있는 종별만

    // 파이 차트 데이터
    const pieData = divisionStats.map(stat => ({
        name: stat.division,
        value: stat.totalScore,
        count: stat.count,
    }));

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">경기도 종별 분석</h1>
                    <p className="text-muted-foreground mt-2">
                        경기도의 종목 카테고리별 성과를 분석합니다.
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* 요약 카드 - Top 3 종별 */}
                        <div className="grid gap-4 md:grid-cols-3">
                            {divisionStats
                                .sort((a, b) => b.totalScore - a.totalScore)
                                .slice(0, 3)
                                .map((stat) => (
                                    <Card key={stat.division}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">{stat.division}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{stat.totalScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                메달: {stat.gold}금 {stat.silver}은 {stat.bronze}동
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>

                        {/* 종별 점수 분포 파이 차트 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>경기도 종별 점수 분포</CardTitle>
                                <CardDescription>
                                    경기도의 전체 점수에서 각 종별이 차지하는 비율입니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, payload }) => `${name} (${payload?.count ?? 0}개)`}
                                                outerRadius={120}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : value} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                                        데이터가 없습니다.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 경기도 종별 상세 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>경기도 종별 상세 통계</CardTitle>
                                <CardDescription>
                                    경기도의 각 종별별 득점 및 메달 현황입니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="p-3 text-left font-medium">종별</th>
                                                <th className="p-3 text-center font-medium">총 득점</th>
                                                <th className="p-3 text-center font-medium">예상</th>
                                                <th className="p-3 text-center font-medium">실제</th>
                                                <th className="p-3 text-center font-medium">금</th>
                                                <th className="p-3 text-center font-medium">은</th>
                                                <th className="p-3 text-center font-medium">동</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {divisionStats
                                                .sort((a, b) => b.totalScore - a.totalScore)
                                                .map((stat) => (
                                                    <tr key={stat.division} className="border-b">
                                                        <td className="p-3 font-medium">{stat.division}</td>
                                                        <td className="p-3 text-center font-bold text-blue-600">
                                                            {stat.totalScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {stat.totalExpected.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {stat.totalActual.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                        </td>
                                                        <td className="p-3 text-center text-yellow-600 font-semibold">
                                                            {stat.gold}
                                                        </td>
                                                        <td className="p-3 text-center text-gray-400 font-semibold">
                                                            {stat.silver}
                                                        </td>
                                                        <td className="p-3 text-center text-orange-600 font-semibold">
                                                            {stat.bronze}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
