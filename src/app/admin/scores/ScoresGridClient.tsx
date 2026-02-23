"use client";

import { useState, useMemo } from "react";
import { Sport, SportEvent } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Trophy, Target } from "lucide-react";
import Link from "next/link";

interface SportWithStats extends Sport {
    eventCount: number;
    divisionCount: number;
}

interface ScoresGridClientProps {
    sports: SportWithStats[];
}

export function ScoresGridClient({ sports }: ScoresGridClientProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredSports = useMemo(() => {
        if (!searchTerm) return sports;

        const lowerSearch = searchTerm.toLowerCase();
        return sports.filter(sport =>
            sport.name.toLowerCase().includes(lowerSearch) ||
            sport.sub_name?.toLowerCase().includes(lowerSearch)
        );
    }, [sports, searchTerm]);

    return (
        <div className="space-y-4">
            {/* 검색 */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="종목명 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl"
                />
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSports.map((sport) => (
                            <Link key={sport.id} href={`/admin/scores/${sport.id}`}>
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
