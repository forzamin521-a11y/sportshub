"use client";

import { useState, useMemo } from "react";
import { Sport, SportEvent, RankScoreConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Plus, Settings, Loader2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SportRankScoreTabProps {
    sport: Sport;
    events: SportEvent[];
    eventsByDivision: Record<string, SportEvent[]>;
    divisions: string[];
    initialRankScores: RankScoreConfig[];
}

export function SportRankScoreTab({
    sport,
    events,
    eventsByDivision,
    divisions,
    initialRankScores,
}: SportRankScoreTabProps) {
    const router = useRouter();
    const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
    const [rankScores, setRankScores] = useState(initialRankScores);

    // Bulk dialog state
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [bulkLevel, setBulkLevel] = useState<"sport" | "division" | "event">("sport");
    const [bulkDivision, setBulkDivision] = useState("");
    const [bulkEventId, setBulkEventId] = useState("");
    const [bulkMaxRank, setBulkMaxRank] = useState(8);
    const [bulkScores, setBulkScores] = useState<Array<{ rank: string; rank_label: string; acquired_score: number; medal_score: number }>>([]);
    const [includeTournamentRounds, setIncludeTournamentRounds] = useState(false);
    const [saving, setSaving] = useState(false);

    const toggleDivision = (division: string) => {
        const newExpanded = new Set(expandedDivisions);
        if (newExpanded.has(division)) {
            newExpanded.delete(division);
        } else {
            newExpanded.add(division);
        }
        setExpandedDivisions(newExpanded);
    };

    // Get rank scores for specific event
    const getEventRankScores = (eventId: string) => {
        return rankScores.filter(rs => rs.sport_event_id === eventId).sort((a, b) => {
            // 라운드는 맨 뒤로 (round_of_로 시작)
            const aIsRound = a.rank.startsWith('round_of_');
            const bIsRound = b.rank.startsWith('round_of_');
            if (aIsRound && !bIsRound) return 1;
            if (!aIsRound && bIsRound) return -1;
            if (aIsRound && bIsRound) {
                // 라운드끼리는 숫자가 작을수록 앞 (4강 > 8강 > 16강)
                const aNum = parseInt(a.rank.replace('round_of_', ''));
                const bNum = parseInt(b.rank.replace('round_of_', ''));
                return aNum - bNum;
            }
            // 순위는 숫자로 비교
            return parseInt(a.rank) - parseInt(b.rank);
        });
    };

    // Check if event has rank scores
    const isEventConfigured = (eventId: string) => {
        return rankScores.some(rs => rs.sport_event_id === eventId);
    };

    // Initialize bulk scores
    const initBulkScores = (maxRank: number) => {
        const defaultScores = [
            { rank: "1", rank_label: "1위", acquired_score: 10, medal_score: 5 },
            { rank: "2", rank_label: "2위", acquired_score: 8, medal_score: 3 },
            { rank: "3", rank_label: "3위", acquired_score: 6, medal_score: 2 },
            { rank: "4", rank_label: "4위", acquired_score: 5, medal_score: 0 },
            { rank: "5", rank_label: "5위", acquired_score: 4, medal_score: 0 },
            { rank: "6", rank_label: "6위", acquired_score: 3, medal_score: 0 },
            { rank: "7", rank_label: "7위", acquired_score: 2, medal_score: 0 },
            { rank: "8", rank_label: "8위", acquired_score: 1, medal_score: 0 },
        ];
        const scores = [];
        for (let i = 1; i <= maxRank; i++) {
            const rankStr = i.toString();
            const defaultScore = defaultScores.find(d => d.rank === rankStr);
            scores.push(defaultScore || { rank: rankStr, rank_label: `${i}위`, acquired_score: 0, medal_score: 0 });
        }
        setBulkScores(scores);
    };

    // Adjust bulk scores count while preserving existing data
    const adjustBulkScoresCount = (newMaxRank: number) => {
        const defaultScores = [
            { rank: "1", rank_label: "1위", acquired_score: 10, medal_score: 5 },
            { rank: "2", rank_label: "2위", acquired_score: 8, medal_score: 3 },
            { rank: "3", rank_label: "3위", acquired_score: 6, medal_score: 2 },
            { rank: "4", rank_label: "4위", acquired_score: 5, medal_score: 0 },
            { rank: "5", rank_label: "5위", acquired_score: 4, medal_score: 0 },
            { rank: "6", rank_label: "6위", acquired_score: 3, medal_score: 0 },
            { rank: "7", rank_label: "7위", acquired_score: 2, medal_score: 0 },
            { rank: "8", rank_label: "8위", acquired_score: 1, medal_score: 0 },
        ];

        setBulkScores(prev => {
            // Separate tournament rounds from regular ranks
            const tournamentRounds = prev.filter(s => s.rank.startsWith('round_of_'));
            const regularRanks = prev.filter(s => !s.rank.startsWith('round_of_'));

            const newScores = [];
            for (let i = 1; i <= newMaxRank; i++) {
                const rankStr = i.toString();
                // Try to find existing score for this rank
                const existingScore = regularRanks.find(s => s.rank === rankStr);
                if (existingScore) {
                    newScores.push(existingScore);
                } else {
                    // Use default or create new
                    const defaultScore = defaultScores.find(d => d.rank === rankStr);
                    newScores.push(defaultScore || { rank: rankStr, rank_label: `${i}위`, acquired_score: 0, medal_score: 0 });
                }
            }

            // Add tournament rounds back at the end
            return [...newScores, ...tournamentRounds];
        });
    };

    const handleBulkDialogOpen = (level: "sport" | "division" | "event", division?: string, eventId?: string) => {
        setBulkLevel(level);
        setBulkDivision(division || "");
        setBulkEventId(eventId || "");

        // If event level, try to load existing rank scores
        if (level === "event" && eventId) {
            const existingScores = getEventRankScores(eventId);
            if (existingScores.length > 0) {
                // Use existing scores
                const onlyRanks = existingScores.filter(rs => !rs.rank.startsWith('round_of_'));
                const hasTournamentRounds = existingScores.some(rs => rs.rank.startsWith('round_of_'));
                setBulkMaxRank(onlyRanks.length);
                setIncludeTournamentRounds(hasTournamentRounds);
                setBulkScores(existingScores.map(rs => ({
                    rank: rs.rank,
                    rank_label: rs.rank_label,
                    acquired_score: rs.acquired_score,
                    medal_score: rs.medal_score,
                })));
            } else {
                // No existing scores, use defaults
                setBulkMaxRank(8);
                setIncludeTournamentRounds(false);
                initBulkScores(8);
            }
        } else if (level === "division" && division) {
            // For division level, try to find a sample event with existing scores
            const divisionEvents = events.filter(e => e.division === division);
            const sampleEventWithScores = divisionEvents.find(e => getEventRankScores(e.id).length > 0);

            if (sampleEventWithScores) {
                const sampleScores = getEventRankScores(sampleEventWithScores.id);
                const onlyRanks = sampleScores.filter(rs => !rs.rank.startsWith('round_of_'));
                const hasTournamentRounds = sampleScores.some(rs => rs.rank.startsWith('round_of_'));
                setBulkMaxRank(onlyRanks.length);
                setIncludeTournamentRounds(hasTournamentRounds);
                setBulkScores(sampleScores.map(rs => ({
                    rank: rs.rank,
                    rank_label: rs.rank_label,
                    acquired_score: rs.acquired_score,
                    medal_score: rs.medal_score,
                })));
            } else {
                setBulkMaxRank(8);
                setIncludeTournamentRounds(false);
                initBulkScores(8);
            }
        } else {
            // Sport level - try to find any event with existing scores
            const anyEventWithScores = events.find(e => getEventRankScores(e.id).length > 0);

            if (anyEventWithScores) {
                const sampleScores = getEventRankScores(anyEventWithScores.id);
                const onlyRanks = sampleScores.filter(rs => !rs.rank.startsWith('round_of_'));
                const hasTournamentRounds = sampleScores.some(rs => rs.rank.startsWith('round_of_'));
                setBulkMaxRank(onlyRanks.length);
                setIncludeTournamentRounds(hasTournamentRounds);
                setBulkScores(sampleScores.map(rs => ({
                    rank: rs.rank,
                    rank_label: rs.rank_label,
                    acquired_score: rs.acquired_score,
                    medal_score: rs.medal_score,
                })));
            } else {
                setBulkMaxRank(8);
                setIncludeTournamentRounds(false);
                initBulkScores(8);
            }
        }

        setShowBulkDialog(true);
    };

    const handleBulkScoreChange = (rank: string, field: 'acquired_score' | 'medal_score', value: number) => {
        setBulkScores(prev => prev.map(s =>
            s.rank === rank ? { ...s, [field]: value } : s
        ));
    };

    const handleTournamentRoundsToggle = (checked: boolean) => {
        setIncludeTournamentRounds(checked);
        if (checked) {
            // Add tournament rounds
            const tournamentRounds = [
                { rank: "round_of_8", rank_label: "8강", acquired_score: 1, medal_score: 0 },
                { rank: "round_of_16", rank_label: "16강", acquired_score: 0.5, medal_score: 0 },
            ];
            setBulkScores(prev => {
                // Remove existing tournament rounds first
                const withoutRounds = prev.filter(s => !s.rank.startsWith('round_of_'));
                return [...withoutRounds, ...tournamentRounds];
            });
        } else {
            // Remove tournament rounds
            setBulkScores(prev => prev.filter(s => !s.rank.startsWith('round_of_')));
        }
    };

    const getBulkTargetEvents = (): SportEvent[] => {
        if (bulkLevel === "event" && bulkEventId) {
            return events.filter(e => e.id === bulkEventId);
        } else if (bulkLevel === "division" && bulkDivision) {
            return events.filter(e => e.division === bulkDivision);
        } else {
            // sport level - all events
            return events;
        }
    };

    const handleBulkAdd = async () => {
        const targetEvents = getBulkTargetEvents();

        if (targetEvents.length === 0) {
            toast.error("대상 세부종목이 없습니다.");
            return;
        }

        setSaving(true);

        try {
            const promises = targetEvents.map(event =>
                fetch("/api/configs/rank-score/bulk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sport_event_id: event.id,
                        scores: bulkScores,
                    }),
                })
            );

            const results = await Promise.all(promises);
            const failedCount = results.filter(r => !r.ok).length;

            if (failedCount > 0) {
                throw new Error(`${failedCount}개의 요청이 실패했습니다.`);
            }

            // Update local state - remove old configs for target events, then add new ones
            const targetEventIds = new Set(targetEvents.map(e => e.id));
            const newConfigs = targetEvents.flatMap(event =>
                bulkScores.map(score => ({
                    id: crypto.randomUUID(),
                    sport_event_id: event.id,
                    rank: score.rank,
                    rank_label: score.rank_label,
                    acquired_score: score.acquired_score,
                    medal_score: score.medal_score,
                    updated_at: new Date().toISOString(),
                }))
            );
            setRankScores(prev => [
                ...prev.filter(rs => !targetEventIds.has(rs.sport_event_id)),
                ...newConfigs
            ]);

            toast.success(`${targetEvents.length}개 세부종목에 ${bulkScores.length}개 순위 설정 완료`);
            setShowBulkDialog(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "등록 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const configuredCount = events.filter(e => isEventConfigured(e.id)).length;
    const unconfiguredCount = events.length - configuredCount;

    return (
        <div className="glass-card p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">순위별 점수 설정</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        종목, 종별, 또는 세부종목 단위로 순위별 점수를 일괄 설정합니다.
                        {unconfiguredCount > 0 && (
                            <span className="text-orange-600 font-medium ml-2">
                                ({unconfiguredCount}개 미설정)
                            </span>
                        )}
                    </p>
                </div>
                <Button onClick={() => handleBulkDialogOpen("sport")} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    일괄 설정
                </Button>
            </div>

            {/* Division Tree */}
            <div className="space-y-2">
                {divisions.map(division => {
                    const divisionEvents = eventsByDivision[division] || [];
                    const isExpanded = expandedDivisions.has(division);
                    const configuredInDivision = divisionEvents.filter(e => isEventConfigured(e.id)).length;

                    return (
                        <div key={division} className="border rounded-lg overflow-hidden">
                            {/* Division Header */}
                            <div
                                className="flex items-center justify-between p-3 bg-accent/20 cursor-pointer hover:bg-accent/30 transition-colors"
                                onClick={() => toggleDivision(division)}
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="font-semibold">{division}</span>
                                    <Badge variant="outline">
                                        {divisionEvents.length}개 세부종목
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={configuredInDivision === divisionEvents.length ? "default" : "destructive"}>
                                        {configuredInDivision}/{divisionEvents.length} 설정됨
                                    </Badge>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBulkDialogOpen("division", division);
                                        }}
                                    >
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Events List */}
                            {isExpanded && (
                                <div className="p-3 space-y-2">
                                    {divisionEvents.map(event => {
                                        const eventRankScores = getEventRankScores(event.id);
                                        const isConfigured = eventRankScores.length > 0;

                                        return (
                                            <div key={event.id} className="border rounded-lg p-3 bg-background">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{event.event_name}</span>
                                                        {isConfigured ? (
                                                            <Badge variant="default">{eventRankScores.length}개 순위</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">미설정</Badge>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleBulkDialogOpen("event", division, event.id)}
                                                    >
                                                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                                                        설정
                                                    </Button>
                                                </div>
                                                {isConfigured && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {eventRankScores.map(rs => `${rs.rank_label}(${rs.acquired_score}점)`).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bulk Dialog */}
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>순위별 점수 일괄 설정</DialogTitle>
                        <DialogDescription>
                            {bulkLevel === "sport" && `${sport.name} 전체 세부종목`}
                            {bulkLevel === "division" && `${bulkDivision} 종별의 모든 세부종목`}
                            {bulkLevel === "event" && `선택한 세부종목`}
                            에 순위별 점수를 일괄 설정합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-sm">
                            <span className="font-semibold">적용 대상:</span>{' '}
                            <span className="text-primary">
                                {getBulkTargetEvents().length}개 세부종목
                            </span>
                        </div>

                        <div className="grid gap-2">
                            <Label>등록할 순위 수</Label>
                            <Select
                                value={bulkMaxRank.toString()}
                                onValueChange={(v) => {
                                    const maxRank = parseInt(v);
                                    setBulkMaxRank(maxRank);
                                    adjustBulkScoresCount(maxRank);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                                        <SelectItem key={n} value={n.toString()}>
                                            {n}위까지
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-primary" />
                                <div>
                                    <Label htmlFor="tournament-rounds" className="cursor-pointer">
                                        토너먼트 라운드 포함
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        8강, 16강 진입 점수 추가
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="tournament-rounds"
                                checked={includeTournamentRounds}
                                onCheckedChange={handleTournamentRoundsToggle}
                            />
                        </div>

                        <div className="border rounded-md max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">순위</TableHead>
                                        <TableHead>획득성적 점수</TableHead>
                                        <TableHead>메달점수</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bulkScores.map((score, index) => (
                                        <TableRow key={`rank-${index}-${score.rank}`}>
                                            <TableCell className="font-medium">{score.rank_label}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={score.acquired_score}
                                                    onChange={(e) => handleBulkScoreChange(
                                                        score.rank,
                                                        'acquired_score',
                                                        parseFloat(e.target.value) || 0
                                                    )}
                                                    className="w-24"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={score.medal_score}
                                                    onChange={(e) => handleBulkScoreChange(
                                                        score.rank,
                                                        'medal_score',
                                                        parseFloat(e.target.value) || 0
                                                    )}
                                                    className="w-24"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                            취소
                        </Button>
                        <Button onClick={handleBulkAdd} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {bulkScores.length}개 순위 설정
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
