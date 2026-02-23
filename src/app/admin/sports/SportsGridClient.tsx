"use client";

import { useState, useMemo } from "react";
import { Sport } from "@/types";
import { SportCard } from "@/components/admin/SportCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AVAILABLE_YEARS } from "@/lib/constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SportWithStats extends Sport {
    eventCount: number;
    divisionCount: number;
    configuredEventCount: number;
    unconfiguredEventCount: number;
    configCompletionRate: number;
}

interface SportsGridClientProps {
    sports: SportWithStats[];
    selectedYear: number;
}

export function SportsGridClient({ sports, selectedYear }: SportsGridClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const filteredSports = useMemo(() => {
        if (!searchTerm) return sports;

        const lowerSearch = searchTerm.toLowerCase();
        return sports.filter(sport =>
            sport.name.toLowerCase().includes(lowerSearch) ||
            sport.sub_name?.toLowerCase().includes(lowerSearch)
        );
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
                    <Label className="text-xs text-muted-foreground">설정 기준 연도</Label>
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
                                selectedYear={selectedYear}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
