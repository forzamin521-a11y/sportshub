"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Region, Score, Sport } from "@/types";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requestJson } from "@/lib/api-client";

export default function ComparePage() {
    const [regions, setRegions] = useState<Region[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
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

                const fetchedRegions = data.data.regions || [];
                setRegions(fetchedRegions);
                setSports(data.data.sports || []);
                setScores(data.data.scores || []);

                // 기본적으로 첫 2개 시도 선택
                if (fetchedRegions.length >= 2) {
                    setSelectedRegionIds([fetchedRegions[0].id, fetchedRegions[1].id]);
                } else if (fetchedRegions.length === 1) {
                    setSelectedRegionIds([fetchedRegions[0].id]);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const toggleRegion = (regionId: string) => {
        if (selectedRegionIds.includes(regionId)) {
            setSelectedRegionIds(selectedRegionIds.filter(id => id !== regionId));
        } else {
            if (selectedRegionIds.length < 4) {
                setSelectedRegionIds([...selectedRegionIds, regionId]);
            }
        }
    };

    // 선택된 시도들의 카테고리별 점수 집계
    const comparisonData = sports.reduce((acc, sport) => {
        const category = sport.category || "기타";
        const existingCategory = acc.find(item => item.category === category);

        if (!existingCategory) {
            const categoryData: Record<string, number | string> = { category };

            selectedRegionIds.forEach(regionId => {
                const region = regions.find(r => r.id === regionId);
                if (region) {
                    const regionScores = scores.filter(
                        s => s.region_id === regionId && s.sport_id === sport.id
                    );
                    const total = regionScores.reduce((sum, s) => sum + (s.actual_score || 0), 0);
                    categoryData[region.name] = Number(categoryData[region.name] || 0) + total;
                }
            });

            acc.push(categoryData);
        } else {
            selectedRegionIds.forEach(regionId => {
                const region = regions.find(r => r.id === regionId);
                if (region) {
                    const regionScores = scores.filter(
                        s => s.region_id === regionId && s.sport_id === sport.id
                    );
                    const total = regionScores.reduce((sum, s) => sum + (s.actual_score || 0), 0);
                    existingCategory[region.name] = Number(existingCategory[region.name] || 0) + total;
                }
            });
        }

        return acc;
    }, [] as Record<string, number | string>[]);

    // 비교 테이블 데이터
    const comparisonTableData = selectedRegionIds.map(regionId => {
        const region = regions.find(r => r.id === regionId);
        const regionScores = scores.filter(s => s.region_id === regionId);

        const totalScore = regionScores.reduce((sum, s) => sum + (s.actual_score || 0), 0);
        const totalExpected = regionScores.reduce((sum, s) => sum + (s.expected_score || 0), 0);
        const totalGold = regionScores.reduce((sum, s) => sum + (s.gold || 0), 0);
        const totalSilver = regionScores.reduce((sum, s) => sum + (s.silver || 0), 0);
        const totalBronze = regionScores.reduce((sum, s) => sum + (s.bronze || 0), 0);

        return {
            name: region?.name || regionId,
            totalScore,
            totalExpected,
            achievement: totalExpected > 0 ? ((totalScore / totalExpected) * 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0',
            totalGold,
            totalSilver,
            totalBronze,
            totalMedals: totalGold + totalSilver + totalBronze,
        };
    });

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">비교 분석</h1>
                    <p className="text-muted-foreground mt-2">
                        복수 시도의 성과를 다차원으로 비교합니다.
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* 시도 선택 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>비교할 시도 선택 (최대 4개)</CardTitle>
                                <CardDescription>
                                    비교하려는 시도를 선택하세요. 선택된 시도는 {selectedRegionIds.length}개입니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {regions.map((region) => (
                                        <div key={region.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={region.id}
                                                checked={selectedRegionIds.includes(region.id)}
                                                onCheckedChange={() => toggleRegion(region.id)}
                                                disabled={
                                                    !selectedRegionIds.includes(region.id) &&
                                                    selectedRegionIds.length >= 4
                                                }
                                            />
                                            <label
                                                htmlFor={region.id}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {region.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                {selectedRegionIds.length === 0 && (
                                    <Alert className="mt-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            비교할 시도를 최소 1개 이상 선택하세요.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* 레이더 차트 */}
                        {selectedRegionIds.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>다차원 비교 (레이더 차트)</CardTitle>
                                    <CardDescription>
                                        선택된 시도들의 카테고리별 점수를 비교합니다.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {comparisonData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={500}>
                                            <RadarChart data={comparisonData}>
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="category" />
                                                <PolarRadiusAxis />
                                                {selectedRegionIds.map((regionId, index) => {
                                                    const region = regions.find(r => r.id === regionId);
                                                    if (!region) return null;
                                                    return (
                                                        <Radar
                                                            key={regionId}
                                                            name={region.name}
                                                            dataKey={region.name}
                                                            stroke={COLORS[index % COLORS.length]}
                                                            fill={COLORS[index % COLORS.length]}
                                                            fillOpacity={0.3}
                                                        />
                                                    );
                                                })}
                                                <Legend />
                                                <Tooltip />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                                            데이터가 없습니다.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* 비교 테이블 */}
                        {selectedRegionIds.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>항목별 상세 비교</CardTitle>
                                    <CardDescription>
                                        선택된 시도들의 주요 지표를 비교합니다.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/50">
                                                    <th className="p-3 text-left font-medium">시도</th>
                                                    <th className="p-3 text-center font-medium">실제 총점</th>
                                                    <th className="p-3 text-center font-medium">예상 총점</th>
                                                    <th className="p-3 text-center font-medium">달성률</th>
                                                    <th className="p-3 text-center font-medium">금</th>
                                                    <th className="p-3 text-center font-medium">은</th>
                                                    <th className="p-3 text-center font-medium">동</th>
                                                    <th className="p-3 text-center font-medium">총 메달</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {comparisonTableData
                                                    .sort((a, b) => b.totalScore - a.totalScore)
                                                    .map((data, index) => (
                                                        <tr key={index} className="border-b">
                                                            <td className="p-3 font-semibold">{data.name}</td>
                                                            <td className="p-3 text-center font-semibold text-blue-600">
                                                                {data.totalScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {data.totalExpected.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span
                                                                    className={`font-medium ${
                                                                        parseFloat(data.achievement) >= 100
                                                                            ? 'text-green-600'
                                                                            : parseFloat(data.achievement) >= 90
                                                                            ? 'text-blue-600'
                                                                            : 'text-gray-600'
                                                                    }`}
                                                                >
                                                                    {data.achievement}%
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center text-amber-500 font-medium">
                                                                {data.totalGold}
                                                            </td>
                                                            <td className="p-3 text-center text-gray-400 font-medium">
                                                                {data.totalSilver}
                                                            </td>
                                                            <td className="p-3 text-center text-orange-600 font-medium">
                                                                {data.totalBronze}
                                                            </td>
                                                            <td className="p-3 text-center font-semibold">
                                                                {data.totalMedals}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
