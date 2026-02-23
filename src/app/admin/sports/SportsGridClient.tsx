"use client";

import { useState, useMemo } from "react";
import { Sport } from "@/types";
import { SportCard } from "@/components/admin/SportCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SportWithStats extends Sport {
    eventCount: number;
    divisionCount: number;
    configuredEventCount: number;
    unconfiguredEventCount: number;
    configCompletionRate: number;
}

interface SportsGridClientProps {
    sports: SportWithStats[];
}

export function SportsGridClient({ sports }: SportsGridClientProps) {
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
                            <SportCard
                                key={sport.id}
                                sport={sport}
                                eventCount={sport.eventCount}
                                divisionCount={sport.divisionCount}
                                configuredEventCount={sport.configuredEventCount}
                                unconfiguredEventCount={sport.unconfiguredEventCount}
                                configCompletionRate={sport.configCompletionRate}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
