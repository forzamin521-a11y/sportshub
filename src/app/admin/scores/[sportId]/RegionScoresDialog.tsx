"use client";

import { useState, useEffect, useMemo } from "react";
import { Sport, SportEvent, Score, Region, RankScoreConfig } from "@/types";
import { RecordType } from "@/lib/record-types";
import { CURRENT_YEAR } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RegionScoresDialogProps {
    event: SportEvent;
    sport: Sport;
    regions: Region[];
    initialScores: Score[];
    allScores: Score[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScoresUpdate: (scores: Score[], year: number) => void;
}

export function RegionScoresDialog({
    event,
    sport,
    regions,
    initialScores,
    allScores,
    open,
    onOpenChange,
    onScoresUpdate,
}: RegionScoresDialogProps) {
    const router = useRouter();
    const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
    const [rankScores, setRankScores] = useState<RankScoreConfig[]>([]);
    const [saving, setSaving] = useState(false);

    // National total scores for this event (actual + expected)
    const [nationalTotal, setNationalTotal] = useState<number>(0);
    const [expectedNationalTotal, setExpectedNationalTotal] = useState<number>(0);
    const [matchDate, setMatchDate] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);

    // Current selected region tab
    const [selectedRegionId, setSelectedRegionId] = useState<string>("");

    // Initialize scores for all regions
    const [regionScores, setRegionScores] = useState<Record<string, Partial<Score>>>({});

    const allScoresForYear = useMemo(
        () => allScores.filter((s) => (s.year ?? CURRENT_YEAR) === selectedYear),
        [allScores, selectedYear]
    );

    const initialScoresForYear = useMemo(
        () => initialScores.filter((s) => (s.year ?? CURRENT_YEAR) === selectedYear),
        [initialScores, selectedYear]
    );

    // Calculate actual alpha score based on ALL sub-events' national totals
    const alphaScore = useMemo(() => {
        const subEventTotals = new Map<string, number>();
        allScoresForYear.forEach(score => {
            if (score.sport_event_id && score.sub_event_total) {
                subEventTotals.set(score.sport_event_id, score.sub_event_total);
            }
        });

        if (nationalTotal > 0) {
            subEventTotals.set(event.id, nationalTotal);
        }

        const totalNationalScore = Array.from(subEventTotals.values()).reduce((sum, val) => sum + val, 0);

        if (totalNationalScore === 0) return 0;
        return sport.max_score / totalNationalScore;
    }, [sport.max_score, allScoresForYear, nationalTotal, event.id]);

    // Calculate expected alpha score (expected_sub_event_total only, no fallback)
    const expectedAlphaScore = useMemo(() => {
        const subEventTotals = new Map<string, number>();
        allScoresForYear.forEach(score => {
            if (score.sport_event_id && score.expected_sub_event_total) {
                subEventTotals.set(score.sport_event_id, score.expected_sub_event_total);
            }
        });

        if (expectedNationalTotal > 0) {
            subEventTotals.set(event.id, expectedNationalTotal);
        }

        const totalNationalScore = Array.from(subEventTotals.values()).reduce((sum, val) => sum + val, 0);

        if (totalNationalScore === 0) return 0;
        return sport.max_score / totalNationalScore;
    }, [sport.max_score, allScoresForYear, expectedNationalTotal, event.id]);

    useEffect(() => {
        if (!open) return;
        const seeded =
            initialScores.find((s) => !!s.match_date) ||
            initialScores.find((s) => (s.year ?? CURRENT_YEAR) === CURRENT_YEAR) ||
            initialScores[0];

        const seededDate = seeded?.match_date || "";
        const seededYear = seededDate
            ? Number(seededDate.slice(0, 4))
            : (seeded?.year ?? CURRENT_YEAR);

        setMatchDate(seededDate);
        setSelectedYear(Number.isFinite(seededYear) && seededYear > 0 ? seededYear : CURRENT_YEAR);
    }, [open, initialScores]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [recordTypesRes, rankScoresRes] = await Promise.all([
                    fetch("/api/record-types"),
                    fetch("/api/configs/rank-score"),
                ]);

                if (recordTypesRes.ok) {
                    const data = await recordTypesRes.json();
                    setRecordTypes(data.data || []);
                }

                if (rankScoresRes.ok) {
                    const data = await rankScoresRes.json();
                    setRankScores(data.data || []);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        }
        fetchData();
    }, []);

    // Recalculate converted scores when alphaScore or expectedAlphaScore changes
    useEffect(() => {
        setRegionScores(prev => {
            const updated: Record<string, Partial<Score>> = {};

            Object.entries(prev).forEach(([regionId, score]) => {
                const newScore = { ...score };

                // Recalculate actual scores
                if (score.rank && alphaScore > 0) {
                    const convertedScore = (score.actual_score || 0) * alphaScore + (score.actual_medal_score || 0);
                    const recordType = recordTypes.find(rt => rt.id === score.record_type);
                    const confirmedBonus = recordType && recordType.bonus_percentage > 0
                        ? (score.actual_score || 0) * (recordType.bonus_percentage / 100)
                        : 0;
                    const totalScore = convertedScore + confirmedBonus;

                    newScore.converted_score = convertedScore;
                    newScore.confirmed_bonus = confirmedBonus;
                    newScore.total_score = totalScore;
                }

                // Recalculate expected scores
                if (score.expected_rank && expectedAlphaScore > 0) {
                    const expectedConvertedScore = (score.expected_score || 0) * expectedAlphaScore + (score.expected_medal_score || 0);
                    const expectedRecordType = recordTypes.find(rt => rt.id === score.expected_record_type);
                    const expectedConfirmedBonus = expectedRecordType && expectedRecordType.bonus_percentage > 0
                        ? (score.expected_score || 0) * (expectedRecordType.bonus_percentage / 100)
                        : 0;
                    const expectedTotalScore = expectedConvertedScore + expectedConfirmedBonus;

                    newScore.expected_converted_score = expectedConvertedScore;
                    newScore.expected_confirmed_bonus = expectedConfirmedBonus;
                    newScore.expected_total_score = expectedTotalScore;
                }

                updated[regionId] = newScore;
            });

            return updated;
        });
    }, [alphaScore, expectedAlphaScore, recordTypes]);

    useEffect(() => {
        // Initialize scores
        const scoresMap: Record<string, Partial<Score>> = {};

        regions.forEach(region => {
            const existingScore = initialScoresForYear.find(s => s.region_id === region.id);
            scoresMap[region.id] = existingScore || {
                sport_id: sport.id,
                sport_event_id: event.id,
                region_id: region.id,
                division: event.division,
                expected_rank: undefined,
                expected_score: 0,
                expected_medal_score: 0,
                rank: undefined,
                actual_score: 0,
                actual_medal_score: 0,
                record_type: "none",
                expected_record_type: "none",
                converted_score: 0,
                confirmed_bonus: 0,
                total_score: 0,
                expected_converted_score: 0,
                expected_confirmed_bonus: 0,
                expected_total_score: 0,
            };
        });

        setRegionScores(scoresMap);

        // Initialize national totals from first score
        if (initialScoresForYear.length > 0) {
            if (initialScoresForYear[0].sub_event_total) {
                setNationalTotal(initialScoresForYear[0].sub_event_total);
            } else {
                setNationalTotal(0);
            }
            if (initialScoresForYear[0].expected_sub_event_total) {
                setExpectedNationalTotal(initialScoresForYear[0].expected_sub_event_total);
            } else {
                setExpectedNationalTotal(0);
            }
        } else {
            setNationalTotal(0);
            setExpectedNationalTotal(0);
        }
    }, [regions, initialScoresForYear, sport.id, event]);

    // Set first region as selected (separate effect)
    useEffect(() => {
        if (regions.length > 0 && !selectedRegionId) {
            setSelectedRegionId(regions[0].id);
        }
    }, [regions, selectedRegionId]);

    // Get available rank options for this event
    const availableRanks = useMemo(() => {
        const eventRankScores = rankScores.filter(rs => rs.sport_event_id === event.id);
        return eventRankScores.sort((a, b) => {
            const aRank = String(a.rank);
            const bRank = String(b.rank);
            const aIsRound = aRank.startsWith('round_of_');
            const bIsRound = bRank.startsWith('round_of_');
            if (aIsRound && !bIsRound) return 1;
            if (!aIsRound && bIsRound) return -1;
            if (aIsRound && bIsRound) {
                const aNum = parseInt(aRank.replace('round_of_', ''));
                const bNum = parseInt(bRank.replace('round_of_', ''));
                return aNum - bNum;
            }
            return parseInt(aRank) - parseInt(bRank);
        });
    }, [rankScores, event.id]);

    // Auto-calculate scores when rank changes
    const handleRankChange = (regionId: string, field: 'expected_rank' | 'rank', value: string | undefined) => {
        const rankScore = value ? rankScores.find(rs =>
            rs.sport_event_id === event.id && rs.rank === value
        ) : null;

        setRegionScores(prev => {
            const current = prev[regionId] || {};
            const updated = {
                ...current,
                [field]: value,
            };

            if (field === 'expected_rank') {
                updated.expected_score = rankScore?.acquired_score || 0;
                updated.expected_medal_score = rankScore?.medal_score || 0;

                // Recalculate expected scores
                if (expectedAlphaScore > 0) {
                    updated.expected_converted_score = (updated.expected_score || 0) * expectedAlphaScore + (updated.expected_medal_score || 0);
                    const expectedRecordType = recordTypes.find(rt => rt.id === updated.expected_record_type);
                    if (expectedRecordType && expectedRecordType.bonus_percentage > 0) {
                        updated.expected_confirmed_bonus = (updated.expected_score || 0) * (expectedRecordType.bonus_percentage / 100);
                    } else {
                        updated.expected_confirmed_bonus = 0;
                    }
                    updated.expected_total_score = (updated.expected_converted_score || 0) + (updated.expected_confirmed_bonus || 0);
                }
            } else if (field === 'rank') {
                updated.actual_score = rankScore?.acquired_score || 0;
                updated.actual_medal_score = rankScore?.medal_score || 0;

                // Recalculate converted score
                updated.converted_score = (updated.actual_score || 0) * alphaScore + (updated.actual_medal_score || 0);

                // Recalculate confirmed bonus
                const recordType = recordTypes.find(rt => rt.id === updated.record_type);
                if (recordType && recordType.bonus_percentage > 0) {
                    updated.confirmed_bonus = (updated.actual_score || 0) * (recordType.bonus_percentage / 100);
                } else {
                    updated.confirmed_bonus = 0;
                }

                // Recalculate total score
                updated.total_score = (updated.converted_score || 0) + (updated.confirmed_bonus || 0);
            }

            return {
                ...prev,
                [regionId]: updated,
            };
        });
    };

    const handleRecordTypeChange = (regionId: string, recordTypeId: string) => {
        setRegionScores(prev => {
            const current = prev[regionId] || {};
            const recordType = recordTypes.find(rt => rt.id === recordTypeId);

            let confirmed_bonus = 0;
            if (recordType && recordType.bonus_percentage > 0) {
                confirmed_bonus = (current.actual_score || 0) * (recordType.bonus_percentage / 100);
            }

            const total_score = (current.converted_score || 0) + confirmed_bonus;

            return {
                ...prev,
                [regionId]: {
                    ...current,
                    record_type: recordTypeId,
                    confirmed_bonus,
                    total_score,
                },
            };
        });
    };

    const handleExpectedRecordTypeChange = (regionId: string, recordTypeId: string) => {
        setRegionScores(prev => {
            const current = prev[regionId] || {};
            const recordType = recordTypes.find(rt => rt.id === recordTypeId);

            let expected_confirmed_bonus = 0;
            if (recordType && recordType.bonus_percentage > 0) {
                expected_confirmed_bonus = (current.expected_score || 0) * (recordType.bonus_percentage / 100);
            }

            const expected_total_score = (current.expected_converted_score || 0) + expected_confirmed_bonus;

            return {
                ...prev,
                [regionId]: {
                    ...current,
                    expected_record_type: recordTypeId,
                    expected_confirmed_bonus,
                    expected_total_score,
                },
            };
        });
    };

    const handleSaveAll = async () => {
        setSaving(true);

        try {
            const eventScoresPayload = regions
                .map(region => {
                    const score = regionScores[region.id];
                    if (!score) return null;
                    const hasExisting = initialScoresForYear.find(s => s.region_id === region.id);
                    if ((score.actual_score || 0) === 0 && (score.expected_score || 0) === 0 && !hasExisting) {
                        return null;
                    }
                    return {
                        region_id: region.id,
                        division: event.division,
                        expected_rank: score.expected_rank,
                        expected_score: score.expected_score || 0,
                        expected_medal_score: score.expected_medal_score || 0,
                        actual_score: score.actual_score || 0,
                        actual_medal_score: score.actual_medal_score || 0,
                        record_type: score.record_type || "none",
                        expected_record_type: score.expected_record_type || "none",
                        rank: score.rank,
                        gold: score.gold || 0,
                        silver: score.silver || 0,
                        bronze: score.bronze || 0,
                        match_date: matchDate || undefined,
                    };
                })
                .filter(Boolean);

            const res = await fetch("/api/scores/save-and-recalculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sport_id: sport.id,
                    mode: "save",
                    sport_event_id: event.id,
                    year: selectedYear,
                    sub_event_total: nationalTotal,
                    expected_sub_event_total: expectedNationalTotal,
                    event_scores: eventScoresPayload,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "저장 실패");
            }

            const result = await res.json();

            onScoresUpdate(result.data.scores, selectedYear);

            const alphaDisplay = result.data.alphaScore > 0
                ? `\n실제 알점수: ${result.data.alphaScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
                : "";
            const expectedAlphaDisplay = result.data.expectedAlphaScore > 0
                ? `\n예상 알점수: ${result.data.expectedAlphaScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
                : "";
            toast.success(`${selectedYear}년 점수가 저장되고 환산점수가 자동 재계산되었습니다.${alphaDisplay}${expectedAlphaDisplay}`);

            router.refresh();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes("한도") || message.includes("quota")) {
                toast.error("Google Sheets API 한도 초과. 잠시 후 다시 시도해주세요.");
            } else {
                toast.error(message || "저장 중 오류가 발생했습니다.");
            }
        } finally {
            setSaving(false);
        }
    };

    const currentRegion = regions.find(r => r.id === selectedRegionId);
    const currentScore = regionScores[selectedRegionId] || {};
    const currentRegionIndex = regions.findIndex(r => r.id === selectedRegionId);

    const goToPrevRegion = () => {
        if (currentRegionIndex > 0) {
            setSelectedRegionId(regions[currentRegionIndex - 1].id);
        }
    };

    const goToNextRegion = () => {
        if (currentRegionIndex < regions.length - 1) {
            setSelectedRegionId(regions[currentRegionIndex + 1].id);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {sport.name} - {event.division} - {event.event_name}
                    </DialogTitle>
                    <DialogDescription>
                        시/도별로 예상/실제 점수를 입력하면 자동으로 계산됩니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border rounded-lg">
                        <Label className="text-sm font-semibold text-slate-700">대회연도</Label>
                        <Input value={selectedYear || CURRENT_YEAR} disabled className="mt-1 bg-white/70 font-semibold" />
                    </div>
                    <div className="p-3 bg-slate-50 border rounded-lg">
                        <Label className="text-sm font-semibold text-slate-700">경기일자</Label>
                        <Input
                            type="date"
                            value={matchDate}
                            onChange={(e) => {
                                const date = e.target.value;
                                setMatchDate(date);
                                const parsedYear = Number(date.slice(0, 4));
                                if (Number.isFinite(parsedYear) && parsedYear > 0) {
                                    setSelectedYear(parsedYear);
                                }
                            }}
                            className="mt-1 bg-white"
                        />
                    </div>
                </div>

                {/* National Total Scores - Expected & Actual */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Expected National Total */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="grid gap-1.5">
                            <Label className="text-sm font-semibold text-emerald-700">
                                예상 전국점수합계
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={expectedNationalTotal}
                                onChange={(e) => setExpectedNationalTotal(parseFloat(e.target.value) || 0)}
                                className="font-bold text-base border-emerald-300"
                                placeholder="0"
                            />
                            {expectedAlphaScore > 0 && (
                                <p className="text-xs text-emerald-600 font-semibold">
                                    예상 알점수: {expectedAlphaScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actual National Total */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="grid gap-1.5">
                            <Label className="text-sm font-semibold text-blue-700">
                                실제 전국점수합계
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={nationalTotal}
                                onChange={(e) => setNationalTotal(parseFloat(e.target.value) || 0)}
                                className="font-bold text-base border-blue-300"
                                placeholder="0"
                            />
                            {alphaScore > 0 && (
                                <p className="text-xs text-blue-600 font-semibold">
                                    실제 알점수: {alphaScore.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground -mt-2">
                    알점수 = {sport.name} 확정점수({sport.max_score}) / 전체 세부종목 전국점수합계
                </p>

                {/* Region Tabs */}
                <Tabs value={selectedRegionId} onValueChange={setSelectedRegionId} className="space-y-4">
                    <div className="border-b">
                        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
                            {regions.map(region => (
                                <TabsTrigger
                                    key={region.id}
                                    value={region.id}
                                    className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-primary"
                                >
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: region.color }}
                                    />
                                    {region.name}
                                    {regionScores[region.id]?.actual_score ? (
                                        <Badge variant="default" className="ml-1 h-4 text-[10px]">✓</Badge>
                                    ) : null}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {currentRegion && (
                        <TabsContent value={selectedRegionId} className="space-y-4 m-0">
                            {/* Expected Section (Green) */}
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                                <div className="text-sm font-semibold text-emerald-700">예상</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {/* Expected Rank */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">예상순위</Label>
                                        <Select
                                            value={currentScore.expected_rank?.toString() || ""}
                                            onValueChange={(v) => handleRankChange(
                                                selectedRegionId,
                                                'expected_rank',
                                                v || undefined
                                            )}
                                        >
                                            <SelectTrigger className="border-emerald-300">
                                                <SelectValue placeholder="선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableRanks.map(rankConfig => (
                                                    <SelectItem key={rankConfig.rank} value={rankConfig.rank}>
                                                        {rankConfig.rank_label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Expected Score (Auto) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">예상점수</Label>
                                        <Input
                                            value={currentScore.expected_score || 0}
                                            disabled
                                            className="bg-white/50 font-semibold text-sm"
                                        />
                                    </div>

                                    {/* Expected Record Type */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">예상 신기록</Label>
                                        <Select
                                            value={currentScore.expected_record_type || "none"}
                                            onValueChange={(v) => handleExpectedRecordTypeChange(selectedRegionId, v)}
                                        >
                                            <SelectTrigger className="border-emerald-300">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {recordTypes.map(type => (
                                                    <SelectItem key={type.id} value={type.id}>
                                                        {type.name}
                                                        {type.bonus_percentage > 0 && (
                                                            <span className="text-orange-600 ml-1">
                                                                ({type.bonus_percentage}%)
                                                            </span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Actual Section (Blue) */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                                <div className="text-sm font-semibold text-blue-700">실제</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {/* Actual Rank */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">실제순위</Label>
                                        <Select
                                            value={currentScore.rank?.toString() || ""}
                                            onValueChange={(v) => handleRankChange(
                                                selectedRegionId,
                                                'rank',
                                                v || undefined
                                            )}
                                        >
                                            <SelectTrigger className="border-blue-300">
                                                <SelectValue placeholder="선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableRanks.map(rankConfig => (
                                                    <SelectItem key={rankConfig.rank} value={rankConfig.rank}>
                                                        {rankConfig.rank_label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Actual Score (Auto) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">실제점수</Label>
                                        <Input
                                            value={currentScore.actual_score || 0}
                                            disabled
                                            className="bg-white/50 font-semibold text-sm"
                                        />
                                    </div>

                                    {/* Actual Record Type */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">실제 신기록</Label>
                                        <Select
                                            value={currentScore.record_type || "none"}
                                            onValueChange={(v) => handleRecordTypeChange(selectedRegionId, v)}
                                        >
                                            <SelectTrigger className="border-blue-300">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {recordTypes.map(type => (
                                                    <SelectItem key={type.id} value={type.id}>
                                                        {type.name}
                                                        {type.bonus_percentage > 0 && (
                                                            <span className="text-orange-600 ml-1">
                                                                ({type.bonus_percentage}%)
                                                            </span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Calculated Results - Expected vs Actual Comparison */}
                            <div className="p-4 bg-accent/50 rounded-lg space-y-3">
                                <div className="flex items-center gap-2 text-primary">
                                    <Calculator className="h-4 w-4" />
                                    <span className="font-semibold">계산 결과 비교</span>
                                </div>

                                {(nationalTotal === 0 && expectedNationalTotal === 0) ? (
                                    <div className="text-sm text-orange-600 font-medium">
                                        전국점수합계를 먼저 입력하세요
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Expected Results */}
                                        <div className="space-y-2 p-3 bg-emerald-50 rounded border border-emerald-200">
                                            <div className="text-xs font-semibold text-emerald-700">예상</div>
                                            <div className="text-xs text-muted-foreground space-y-0.5">
                                                <div>예상점수: {currentScore.expected_score || 0}</div>
                                                <div>메달득점: {currentScore.expected_medal_score || 0}</div>
                                            </div>
                                            <div className="space-y-1 pt-1 border-t border-emerald-200 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">환산:</span>
                                                    <span className="font-semibold text-emerald-700">{(currentScore.expected_converted_score || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">가산:</span>
                                                    <span className="font-semibold text-orange-600">{(currentScore.expected_confirmed_bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div className="flex justify-between pt-1 border-t border-emerald-200">
                                                    <span className="font-semibold">총점:</span>
                                                    <span className="font-bold text-lg text-emerald-700">{(currentScore.expected_total_score || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actual Results */}
                                        <div className="space-y-2 p-3 bg-blue-50 rounded border border-blue-200">
                                            <div className="text-xs font-semibold text-blue-700">실제</div>
                                            <div className="text-xs text-muted-foreground space-y-0.5">
                                                <div>실제점수: {currentScore.actual_score || 0}</div>
                                                <div>메달득점: {currentScore.actual_medal_score || 0}</div>
                                            </div>
                                            <div className="space-y-1 pt-1 border-t border-blue-200 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">환산:</span>
                                                    <span className="font-semibold text-blue-700">{(currentScore.converted_score || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">가산:</span>
                                                    <span className="font-semibold text-orange-600">{(currentScore.confirmed_bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div className="flex justify-between pt-1 border-t border-blue-200">
                                                    <span className="font-semibold">총점:</span>
                                                    <span className="font-bold text-lg text-blue-700">{(currentScore.total_score || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Difference */}
                                {(currentScore.total_score || 0) > 0 && (currentScore.expected_total_score || 0) > 0 && (
                                    <div className="pt-2 border-t text-center">
                                        {(() => {
                                            const diff = (currentScore.total_score || 0) - (currentScore.expected_total_score || 0);
                                            const diffColor = diff > 0 ? "text-blue-600" : diff < 0 ? "text-red-600" : "text-gray-600";
                                            const diffSign = diff > 0 ? "+" : "";
                                            return (
                                                <span className={`text-sm font-bold ${diffColor}`}>
                                                    차이: {diffSign}{diff.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} (실제 - 예상)
                                                </span>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Navigation */}
                            <div className="flex justify-between items-center pt-2">
                                <Button
                                    variant="outline"
                                    onClick={goToPrevRegion}
                                    disabled={currentRegionIndex === 0}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    이전
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    {currentRegionIndex + 1} / {regions.length}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={goToNextRegion}
                                    disabled={currentRegionIndex === regions.length - 1}
                                >
                                    다음
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        취소
                    </Button>
                    <Button onClick={handleSaveAll} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        전체 저장
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
