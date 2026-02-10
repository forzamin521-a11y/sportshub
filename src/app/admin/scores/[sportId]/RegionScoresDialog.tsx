"use client";

import { useState, useEffect, useMemo } from "react";
import { Sport, SportEvent, Score, Region, RankScoreConfig } from "@/types";
import { RecordType } from "@/lib/record-types";
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
    onScoresUpdate: (scores: Score[]) => void;
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

    // National total score for this event
    const [nationalTotal, setNationalTotal] = useState<number>(0);

    // Current selected region tab
    const [selectedRegionId, setSelectedRegionId] = useState<string>("");

    // Initialize scores for all regions
    const [regionScores, setRegionScores] = useState<Record<string, Partial<Score>>>({});

    // Calculate alpha score based on ALL sub-events' national totals
    const alphaScore = useMemo(() => {
        // Get unique sub_event_totals from ALL scores for this sport
        const subEventTotals = new Map<string, number>();
        allScores.forEach(score => {
            if (score.sport_event_id && score.sub_event_total) {
                subEventTotals.set(score.sport_event_id, score.sub_event_total);
            }
        });

        // Update current event's total with the input value
        if (nationalTotal > 0) {
            subEventTotals.set(event.id, nationalTotal);
        }

        // Sum all sub-event totals
        const totalNationalScore = Array.from(subEventTotals.values()).reduce((sum, val) => sum + val, 0);

        if (totalNationalScore === 0) return 0;
        return sport.max_score / totalNationalScore;
    }, [sport.max_score, allScores, nationalTotal, event.id]);

    useEffect(() => {
        // Fetch record types and rank scores
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

    // Recalculate converted scores when alphaScore changes
    useEffect(() => {
        if (alphaScore === 0) return;

        setRegionScores(prev => {
            const updated: Record<string, Partial<Score>> = {};

            Object.entries(prev).forEach(([regionId, score]) => {
                if (score.rank) {
                    // Recalculate converted score with new alphaScore
                    const convertedScore = (score.actual_score || 0) * alphaScore + (score.actual_medal_score || 0);

                    // Recalculate confirmed bonus
                    const recordType = recordTypes.find(rt => rt.id === score.record_type);
                    const confirmedBonus = recordType && recordType.bonus_percentage > 0
                        ? (score.actual_score || 0) * (recordType.bonus_percentage / 100)
                        : 0;

                    // Recalculate total score
                    const totalScore = convertedScore + confirmedBonus;

                    updated[regionId] = {
                        ...score,
                        converted_score: convertedScore,
                        confirmed_bonus: confirmedBonus,
                        total_score: totalScore,
                    };
                } else {
                    updated[regionId] = score;
                }
            });

            return updated;
        });
    }, [alphaScore, recordTypes]);

    useEffect(() => {
        // Initialize scores
        const scoresMap: Record<string, Partial<Score>> = {};

        regions.forEach(region => {
            const existingScore = initialScores.find(s => s.region_id === region.id);
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
                converted_score: 0,
                confirmed_bonus: 0,
                total_score: 0,
            };
        });

        setRegionScores(scoresMap);

        // Initialize national total from first score's sub_event_total
        if (initialScores.length > 0 && initialScores[0].sub_event_total) {
            setNationalTotal(initialScores[0].sub_event_total);
        }
    }, [regions, initialScores, sport.id, event]);

    // Set first region as selected (separate effect)
    useEffect(() => {
        if (regions.length > 0 && !selectedRegionId) {
            setSelectedRegionId(regions[0].id);
        }
    }, [regions, selectedRegionId]);

    // Get available rank options for this event
    const availableRanks = useMemo(() => {
        const eventRankScores = rankScores.filter(rs => rs.sport_event_id === event.id);
        // Sort: regular ranks first, then tournament rounds
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

    // Auto-calculate scores when rank or record type changes
    const handleRankChange = (regionId: string, field: 'expected_rank' | 'rank', value: string | undefined) => {
        const rankScore = value ? rankScores.find(rs =>
            rs.sport_event_id === event.id && rs.rank === value
        ) : null;

        setRegionScores(prev => {
            const current = prev[regionId] || {};
            let updated = {
                ...current,
                [field]: value,
            };

            if (field === 'expected_rank') {
                updated.expected_score = rankScore?.acquired_score || 0;
                updated.expected_medal_score = rankScore?.medal_score || 0;
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

    const handleSaveAll = async () => {
        setSaving(true);

        try {
            // Build event_scores array from all region scores
            const eventScoresPayload = regions
                .map(region => {
                    const score = regionScores[region.id];
                    if (!score) return null;
                    // Skip regions with no data and no existing score
                    const hasExisting = initialScores.find(s => s.region_id === region.id);
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
                        rank: score.rank,
                        gold: score.gold || 0,
                        silver: score.silver || 0,
                        bronze: score.bronze || 0,
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
                    sub_event_total: nationalTotal,
                    event_scores: eventScoresPayload,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "저장 실패");
            }

            const result = await res.json();

            // Update parent with ALL recalculated scores for the sport
            onScoresUpdate(result.data.scores);

            const alphaDisplay = result.data.alphaScore > 0
                ? `\n알점수: ${result.data.alphaScore.toFixed(4)}`
                : "";
            toast.success(`점수가 저장되고 환산점수가 자동 재계산되었습니다.${alphaDisplay}`);

            router.refresh();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes("한도") || error.message?.includes("quota")) {
                toast.error("Google Sheets API 한도 초과. 잠시 후 다시 시도해주세요.");
            } else {
                toast.error(error.message || "저장 중 오류가 발생했습니다.");
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
                        시/도별로 점수를 입력하면 자동으로 계산됩니다.
                    </DialogDescription>
                </DialogHeader>

                {/* National Total Score */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="grid gap-2">
                        <Label className="text-sm font-semibold text-primary">
                            이 세부종목의 전국점수합계
                        </Label>
                        <Input
                            type="number"
                            step="0.1"
                            value={nationalTotal}
                            onChange={(e) => setNationalTotal(parseFloat(e.target.value) || 0)}
                            className="font-bold text-lg"
                            placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground">
                            ℹ️ 알점수는 <strong>{sport.name}</strong>의 <strong>전체 세부종목 전국점수합계</strong>로 자동 계산됩니다.
                        </p>
                        {alphaScore > 0 && (
                            <p className="text-xs text-green-600 font-semibold">
                                ✓ 현재 알점수: {alphaScore.toFixed(4)}
                            </p>
                        )}
                    </div>
                </div>

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
                            {/* Input Form */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Expected Rank */}
                                <div className="space-y-2">
                                    <Label>예상순위</Label>
                                    <Select
                                        value={currentScore.expected_rank?.toString() || ""}
                                        onValueChange={(v) => handleRankChange(
                                            selectedRegionId,
                                            'expected_rank',
                                            v || undefined
                                        )}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="순위 선택" />
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

                                {/* Expected Score (Auto-calculated) */}
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">예상점수 (자동계산)</Label>
                                    <Input
                                        value={currentScore.expected_score || 0}
                                        disabled
                                        className="bg-muted font-semibold"
                                    />
                                </div>

                                {/* Actual Rank */}
                                <div className="space-y-2">
                                    <Label>실제순위</Label>
                                    <Select
                                        value={currentScore.rank?.toString() || ""}
                                        onValueChange={(v) => handleRankChange(
                                            selectedRegionId,
                                            'rank',
                                            v || undefined
                                        )}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="순위 선택" />
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

                                {/* Actual Score (Auto-calculated) */}
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">실제점수 (자동계산)</Label>
                                    <Input
                                        value={currentScore.actual_score || 0}
                                        disabled
                                        className="bg-muted font-semibold"
                                    />
                                </div>

                                {/* Record Type */}
                                <div className="space-y-2 col-span-2">
                                    <Label>신기록 타입</Label>
                                    <Select
                                        value={currentScore.record_type || "none"}
                                        onValueChange={(v) => handleRecordTypeChange(selectedRegionId, v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {recordTypes.map(type => (
                                                <SelectItem key={type.id} value={type.id}>
                                                    {type.name}
                                                    {type.bonus_percentage > 0 && (
                                                        <span className="text-orange-600 ml-2">
                                                            ({type.bonus_percentage}% 가산)
                                                        </span>
                                                    )}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Calculated Results */}
                            <div className="p-4 bg-accent/50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Calculator className="h-4 w-4" />
                                        <span className="font-semibold">계산 결과</span>
                                    </div>
                                    {nationalTotal > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            알점수: {alphaScore.toFixed(4)}
                                        </span>
                                    )}
                                </div>

                                {nationalTotal === 0 ? (
                                    <div className="text-sm text-orange-600 font-medium">
                                        ⚠️ 전국점수합계를 먼저 입력하세요
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div>실제점수: {currentScore.actual_score || 0}</div>
                                            <div>메달득점: {currentScore.actual_medal_score || 0}</div>
                                            <div className="pt-1 border-t">
                                                환산점수 = ({currentScore.actual_score || 0} × {alphaScore.toFixed(4)}) + {currentScore.actual_medal_score || 0}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">환산점수:</span>
                                                <span className="font-bold text-primary">{(currentScore.converted_score || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">신기록가산:</span>
                                                <span className="font-semibold text-orange-600">{(currentScore.confirmed_bonus || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t">
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground font-semibold">총점:</span>
                                                <span className="font-bold text-2xl text-primary">{(currentScore.total_score || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground text-right">
                                                = {(currentScore.converted_score || 0).toFixed(2)} + {(currentScore.confirmed_bonus || 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </>
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
