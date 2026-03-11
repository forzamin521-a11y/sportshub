"use client";

import { useState, useMemo } from "react";
import { Sport } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Trophy, Target } from "lucide-react";
import Link from "next/link";
import { AVAILABLE_YEARS } from "@/lib/constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SportWithStats extends Sport {
    eventCount: number;
    divisionCount: number;
    scoredEventCount: number;
    unscoredEventCount: number;
    scoreCompletionRate: number;
}

interface ScoresGridClientProps {
    sports: SportWithStats[];
    selectedYear: number;
}

export function ScoresGridClient({ sports, selectedYear }: ScoresGridClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const filteredSports = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        const searched = !searchTerm
            ? sports
            : sports.filter(sport =>
                sport.name.toLowerCase().includes(lowerSearch) ||
                sport.sub_name?.toLowerCase().includes(lowerSearch)
            );

        return [...searched].sort((a, b) => {
            if (a.unscoredEventCount !== b.unscoredEventCount) {
                return b.unscoredEventCount - a.unscoredEventCount;
            }
            return a.name.localeCompare(b.name, "ko");
        });
    }, [sports, searchTerm]);

    const handleYearChange = (year: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("year", year);
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="space-y-4">
            {/* 검색 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="종목명 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rounded-xl"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">통계 기준 연도</Label>
                    <Select value={String(selectedYear)} onValueChange={handleYearChange}>
                        <SelectTrigger className="rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {AVAILABLE_YEARS.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                    {year}년
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 종목 카드 그리드 */}
            {filteredSports.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg">검색 결과가 없습니다.</p>
                    <p className="text-sm mt-2">다른 검색어를 시도해보세요.</p>
                </div>
            ) : (
                <>
                    <div className="text-sm text-muted-foreground">
                        총 {filteredSports.length}개 종목
                        {filteredSports.some((sport) => sport.unscoredEventCount > 0) && (
                            <span className="ml-2 text-orange-600">
                                미입력 세부종목이 많은 종목부터 표시됩니다.
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSports.map((sport) => (
                            <Link key={sport.id} href={`/admin/scores/${sport.id}?year=${selectedYear}`} prefetch>
                                <Card className="glass-card hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 group">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                                            {sport.name}
                                        </CardTitle>
                                        {sport.sub_name && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {sport.sub_name}
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="flex flex-col items-center p-2 rounded-lg bg-primary/5 border border-primary/10">
                                                <Target className="h-4 w-4 text-primary mb-1" />
                                                <span className="text-xs text-muted-foreground">확정점수</span>
                                                <span className="text-sm font-bold mt-0.5">
                                                    {sport.max_score?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || 0}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                                <Search className="h-4 w-4 text-blue-600 mb-1" />
                                                <span className="text-xs text-muted-foreground">종별</span>
                                                <span className="text-sm font-bold mt-0.5">{sport.divisionCount}개</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                                <Trophy className="h-4 w-4 text-purple-600 mb-1" />
                                                <span className="text-xs text-muted-foreground">세부종목</span>
                                                <span className="text-sm font-bold mt-0.5">{sport.eventCount}개</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 rounded-lg border border-sky-200/60 bg-sky-50/60 px-3 py-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-sky-800">점수 입력 현황</span>
                                                <span className={`font-bold ${sport.unscoredEventCount > 0 ? "text-orange-600" : "text-sky-700"}`}>
                                                    {sport.scoredEventCount}/{sport.eventCount} 완료 ({sport.scoreCompletionRate}%)
                                                </span>
                                            </div>
                                            <div className="mt-1 text-[11px] text-muted-foreground">
                                                {sport.unscoredEventCount > 0
                                                    ? `${sport.unscoredEventCount}개 세부종목 미입력`
                                                    : "모든 세부종목 점수 입력 완료"}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
