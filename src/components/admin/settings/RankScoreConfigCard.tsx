"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { Sport, RankScoreConfig, SportEvent } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Pencil, Trash, Plus, X, Check, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRankLabel, rankSortValue } from "@/lib/rank-utils";
import { mutateJson, requestJson, toUserErrorMessage } from "@/lib/api-client";

interface RankScoreConfigCardProps {
    initialConfigs: RankScoreConfig[];
    sports: Sport[];
}

export function RankScoreConfigCard({ initialConfigs, sports }: RankScoreConfigCardProps) {
    const [configs, setConfigs] = useState<RankScoreConfig[]>(initialConfigs);
    const [sportEvents, setSportEvents] = useState<SportEvent[]>([]);
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    // Filters
    const [filterSportId, setFilterSportId] = useState<string>("all");
    const [filterDivision, setFilterDivision] = useState<string>("all");
    const [filterEventId, setFilterEventId] = useState<string>("all");
    const [showOnlyUnconfigured, setShowOnlyUnconfigured] = useState(false);

    // Add rank dialog
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [addEventId, setAddEventId] = useState<string>("");
    const [addRank, setAddRank] = useState<string>("1");
    const [addAcquiredScore, setAddAcquiredScore] = useState<number>(0);
    const [addMedalScore, setAddMedalScore] = useState<number>(0);

    // Edit rank
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAcquiredScore, setEditAcquiredScore] = useState<number>(0);
    const [editMedalScore, setEditMedalScore] = useState<number>(0);

    // Delete
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Bulk Add
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [bulkSportId, setBulkSportId] = useState<string>("");
    const [bulkDivision, setBulkDivision] = useState<string>("");
    const [bulkEventId, setBulkEventId] = useState<string>("");
    const [bulkSearchTerm, setBulkSearchTerm] = useState<string>("");
    const [bulkMaxRank, setBulkMaxRank] = useState<number>(8);
    const [bulkScores, setBulkScores] = useState<Array<{ rank: number; acquired_score: number; medal_score: number }>>([]);

    const router = useRouter();

    useEffect(() => {
        async function fetchSportEvents() {
            try {
                const data = await requestJson<{ data: SportEvent[] }>("/api/sport-events");
                setSportEvents(data.data || []);
            } catch (error) {
                console.error("Failed to fetch sport events:", error);
            }
        }
        fetchSportEvents();
    }, []);

    // Get configs for a specific event
    const getEventConfigs = (eventId: string) => {
        return configs
            .filter(c => c.sport_event_id === eventId)
            .sort((a, b) => rankSortValue(String(a.rank)) - rankSortValue(String(b.rank)));
    };

    const getResponseError = async (res: Response, fallback: string) => {
        try {
            const data = await res.json();
            return data.error || fallback;
        } catch {
            return fallback;
        }
    };

    // Check if event has any configs
    const isEventConfigured = (eventId: string) => {
        return configs.some(c => c.sport_event_id === eventId);
    };

    // Get sport/division/event names
    const getSportName = (sportId: string) => {
        return sports.find(s => s.id === sportId)?.name || sportId;
    };

    const getEventFullName = (event: SportEvent) => {
        return `${getSportName(event.sport_id)} - ${event.division} - ${event.event_name}`;
    };

    // Filter logic
    const filterDivisions = filterSportId !== "all"
        ? Array.from(new Set(sportEvents.filter(e => e.sport_id === filterSportId).map(e => e.division)))
        : [];

    const filterEvents = sportEvents.filter(e => {
        if (filterSportId !== "all" && e.sport_id !== filterSportId) return false;
        if (filterDivision !== "all" && e.division !== filterDivision) return false;
        return true;
    });

    const filteredSportEvents = useMemo(() => {
        let filtered = sportEvents.filter(e => {
            if (filterSportId !== "all" && e.sport_id !== filterSportId) return false;
            if (filterDivision !== "all" && e.division !== filterDivision) return false;
            if (filterEventId !== "all" && e.id !== filterEventId) return false;
            if (showOnlyUnconfigured && isEventConfigured(e.id)) return false;
            return true;
        });
        return filtered.sort((a, b) => getEventFullName(a).localeCompare(getEventFullName(b)));
    }, [sportEvents, filterSportId, filterDivision, filterEventId, showOnlyUnconfigured, configs]);

    const unconfiguredCount = sportEvents.filter(e => !isEventConfigured(e.id)).length;

    const toggleExpand = (eventId: string) => {
        const newExpanded = new Set(expandedEvents);
        if (newExpanded.has(eventId)) {
            newExpanded.delete(eventId);
        } else {
            newExpanded.add(eventId);
        }
        setExpandedEvents(newExpanded);
    };

    const handleAddRank = async () => {
        if (!addEventId) {
            toast.error("세부종목을 선택하세요.");
            return;
        }

        const existingRanks = getEventConfigs(addEventId).map(c => c.rank);
        if (existingRanks.includes(addRank)) {
            toast.error("해당 순위가 이미 존재합니다.");
            return;
        }

        setSaving(true);

        try {
            const res = await fetch("/api/configs/rank-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sport_event_id: addEventId,
                    rank: addRank,
                    rank_label: formatRankLabel(addRank),
                    acquired_score: addAcquiredScore,
                    medal_score: addMedalScore,
                }),
            });

            if (!res.ok) {
                throw new Error(await getResponseError(res, "추가 중 오류가 발생했습니다."));
            }

            const result = await res.json();
            const newConfig = result.data;

            // 로컬 상태 즉시 업데이트
            setConfigs(prev => [...prev, newConfig]);

            toast.success("순위별 점수가 추가되었습니다.");
            setShowAddDialog(false);
            setAddEventId("");
            setAddRank("1");
            setAddAcquiredScore(0);
            setAddMedalScore(0);
        } catch (error) {
            console.error(error);
            const message = toUserErrorMessage(error, "추가 중 오류가 발생했습니다.");
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleEditStart = (config: RankScoreConfig) => {
        setEditingId(config.id);
        setEditAcquiredScore(config.acquired_score);
        setEditMedalScore(config.medal_score);
    };

    const handleEditSave = async (configId: string) => {
        setSaving(true);

        try {
            const res = await fetch("/api/configs/rank-score", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: configId,
                    acquired_score: editAcquiredScore,
                    medal_score: editMedalScore,
                }),
            });

            if (!res.ok) {
                throw new Error(await getResponseError(res, "수정 중 오류가 발생했습니다."));
            }

            // 로컬 상태 즉시 업데이트
            setConfigs(prev => prev.map(c =>
                c.id === configId
                    ? { ...c, acquired_score: editAcquiredScore, medal_score: editMedalScore }
                    : c
            ));

            toast.success("수정되었습니다.");
            setEditingId(null);
        } catch (error) {
            console.error(error);
            const message = toUserErrorMessage(error, "수정 중 오류가 발생했습니다.");
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        setSaving(true);

        try {
            const res = await fetch(`/api/configs/rank-score?id=${deleteId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error(await getResponseError(res, "삭제 중 오류가 발생했습니다."));
            }

            // 로컬 상태 즉시 업데이트
            setConfigs(prev => prev.filter(c => c.id !== deleteId));

            toast.success("삭제되었습니다.");
            setDeleteId(null);
        } catch (error) {
            console.error(error);
            const message = toUserErrorMessage(error, "삭제 중 오류가 발생했습니다.");
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const clearFilters = () => {
        setFilterSportId("all");
        setFilterDivision("all");
        setFilterEventId("all");
        setShowOnlyUnconfigured(false);
    };

    // Initialize bulk scores when dialog opens or maxRank changes
    const initBulkScores = (maxRank: number) => {
        const defaultScores = [
            { rank: 1, acquired_score: 10, medal_score: 5 },
            { rank: 2, acquired_score: 8, medal_score: 3 },
            { rank: 3, acquired_score: 6, medal_score: 2 },
            { rank: 4, acquired_score: 5, medal_score: 0 },
            { rank: 5, acquired_score: 4, medal_score: 0 },
            { rank: 6, acquired_score: 3, medal_score: 0 },
            { rank: 7, acquired_score: 2, medal_score: 0 },
            { rank: 8, acquired_score: 1, medal_score: 0 },
        ];
        const scores = [];
        for (let i = 1; i <= maxRank; i++) {
            const defaultScore = defaultScores.find(d => d.rank === i);
            scores.push(defaultScore || { rank: i, acquired_score: 0, medal_score: 0 });
        }
        setBulkScores(scores);
    };

    // Bulk dialog: get filtered divisions based on sport
    const bulkDivisions = bulkSportId
        ? Array.from(new Set(sportEvents.filter(e => e.sport_id === bulkSportId).map(e => e.division)))
        : [];

    // Bulk dialog: get filtered events based on sport and division
    const bulkFilteredEvents = sportEvents.filter(e => {
        if (bulkSportId && e.sport_id !== bulkSportId) return false;
        if (bulkDivision && bulkDivision !== "all" && e.division !== bulkDivision) return false;
        if (bulkSearchTerm) {
            const searchLower = bulkSearchTerm.toLowerCase();
            const fullName = getEventFullName(e).toLowerCase();
            if (!fullName.includes(searchLower)) return false;
        }
        return true;
    });

    // Get target event IDs for bulk registration
    const getBulkTargetEventIds = (): string[] => {
        if (bulkEventId && bulkEventId !== "all") {
            // Specific event selected
            return [bulkEventId];
        } else if (bulkDivision && bulkDivision !== "all") {
            // Division level: all events in this sport + division
            return sportEvents
                .filter(e => e.sport_id === bulkSportId && e.division === bulkDivision)
                .map(e => e.id);
        } else if (bulkSportId) {
            // Sport level: all events in this sport
            return sportEvents
                .filter(e => e.sport_id === bulkSportId)
                .map(e => e.id);
        }
        return [];
    };

    const handleBulkDialogOpen = (eventId?: string) => {
        setBulkSportId("");
        setBulkDivision("all");
        setBulkEventId(eventId || "all");
        setBulkSearchTerm("");
        setBulkMaxRank(8);
        initBulkScores(8);
        setShowBulkDialog(true);
    };

    const handleBulkMaxRankChange = (maxRank: number) => {
        setBulkMaxRank(maxRank);
        initBulkScores(maxRank);
    };

    const handleBulkScoreChange = (rank: number, field: 'acquired_score' | 'medal_score', value: number) => {
        setBulkScores(prev => prev.map(s =>
            s.rank === rank ? { ...s, [field]: value } : s
        ));
    };

    const handleBulkAdd = async () => {
        const targetEventIds = getBulkTargetEventIds();

        if (targetEventIds.length === 0) {
            toast.error("종목을 선택하세요.");
            return;
        }

        // Check for conflicts across all target events
        const conflicts: string[] = [];
        targetEventIds.forEach(eventId => {
            const existingRanks = getEventConfigs(eventId).map(c => c.rank);
            const conflictRanks = bulkScores.filter(s => existingRanks.includes(String(s.rank)));
            if (conflictRanks.length > 0) {
                const eventName = sportEvents.find(e => e.id === eventId)?.event_name || eventId;
                conflicts.push(`${eventName}: ${conflictRanks.map(c => formatRankLabel(String(c.rank))).join(', ')}`);
            }
        });

        if (conflicts.length > 0) {
            toast.error(`이미 존재하는 순위가 있습니다:\n${conflicts.join('\n')}`, { duration: 5000 });
            return;
        }

        setSaving(true);

        try {
            await mutateJson<{
                message: string;
                count: number;
                event_count: number;
            }, {
                sport_event_ids: string[];
                scores: Array<{ rank: number; acquired_score: number; medal_score: number }>;
            }>("/api/configs/rank-score/bulk", {
                body: {
                    sport_event_ids: targetEventIds,
                    scores: bulkScores,
                },
            });

            // 로컬 상태 즉시 업데이트
            const newConfigs = targetEventIds.flatMap(eventId =>
                bulkScores.map(score => ({
                    id: crypto.randomUUID(),
                    sport_event_id: eventId,
                    rank: String(score.rank),
                    rank_label: formatRankLabel(String(score.rank)),
                    acquired_score: score.acquired_score,
                    medal_score: score.medal_score,
                    updated_at: new Date().toISOString(),
                }))
            );
            const targetEventIdSet = new Set(targetEventIds);
            setConfigs(prev => [
                ...prev.filter(config => !targetEventIdSet.has(config.sport_event_id)),
                ...newConfigs,
            ]);

            toast.success(`${targetEventIds.length}개 세부종목에 ${bulkScores.length}개 순위 설정 완료 (총 ${newConfigs.length}개)`);
            setShowBulkDialog(false);
            setBulkSportId("");
            setBulkDivision("all");
            setBulkEventId("all");
            setBulkSearchTerm("");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(toUserErrorMessage(error, "등록 중 오류가 발생했습니다."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="glass-card p-6 relative">
                {saving && (
                    <div className="absolute inset-0 z-30 bg-background/70 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white shadow-sm text-sm font-medium">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            처리 중입니다. 잠시만 기다려주세요.
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="font-semibold">순위별 점수 설정</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            세부종목별로 순위별 획득성적 점수와 메달점수를 설정합니다.
                            {unconfiguredCount > 0 && (
                                <span className="text-orange-600 font-medium ml-2">
                                    ({unconfiguredCount}개 미설정)
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="rounded-xl text-xs" onClick={() => handleBulkDialogOpen()}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            일괄등록
                        </Button>
                        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl text-xs">
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    순위 추가
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>순위별 점수 추가</DialogTitle>
                                    <DialogDescription>
                                        세부종목에 새로운 순위별 점수를 추가합니다.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>세부종목</Label>
                                        <Select value={addEventId} onValueChange={setAddEventId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="세부종목 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sportEvents.map(event => (
                                                    <SelectItem key={event.id} value={event.id}>
                                                        {getEventFullName(event)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>순위</Label>
                                        <Select value={addRank} onValueChange={setAddRank}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tie_1">공동1위</SelectItem>
                                                {Array.from({ length: 20 }, (_, i) => i + 1).map((rank) => (
                                                    <SelectItem key={rank} value={String(rank)}>
                                                        {rank}위
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>획득성적 점수</Label>
                                        <Input
                                            type="number"
                                            value={addAcquiredScore}
                                            onChange={(e) => setAddAcquiredScore(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>메달점수</Label>
                                        <Input
                                            type="number"
                                            value={addMedalScore}
                                            onChange={(e) => setAddMedalScore(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddRank} disabled={saving}>
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        추가
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="mb-4 p-4 rounded-xl bg-accent/20 border border-border/30">
                        <div className="flex items-center gap-2 mb-3">
                            <Filter className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">필터</span>
                        </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>종목</Label>
                                    <Select value={filterSportId} onValueChange={(val) => {
                                        setFilterSportId(val);
                                        setFilterDivision("all");
                                        setFilterEventId("all");
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="전체 종목" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">전체 종목</SelectItem>
                                            {sports.map(sport => (
                                                <SelectItem key={sport.id} value={sport.id}>
                                                    {sport.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>종별</Label>
                                    <Select
                                        value={filterDivision}
                                        onValueChange={(val) => {
                                            setFilterDivision(val);
                                            setFilterEventId("all");
                                        }}
                                        disabled={filterSportId === "all"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="전체 종별" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">전체 종별</SelectItem>
                                            {filterDivisions.map(div => (
                                                <SelectItem key={div} value={div}>
                                                    {div}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>세부종목</Label>
                                    <Select
                                        value={filterEventId}
                                        onValueChange={setFilterEventId}
                                        disabled={filterSportId === "all"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="전체 세부종목" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">전체 세부종목</SelectItem>
                                            {filterEvents.map((event, idx) => (
                                                <SelectItem key={`${event.id}-${idx}`} value={event.id}>
                                                    {event.event_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="invisible">액션</Label>
                                    <Button onClick={clearFilters} variant="outline" className="w-full">
                                        필터 초기화
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center space-x-2">
                                <Checkbox
                                    id="showUnconfigured"
                                    checked={showOnlyUnconfigured}
                                    onCheckedChange={(checked) => setShowOnlyUnconfigured(!!checked)}
                                />
                                <label
                                    htmlFor="showUnconfigured"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    미설정 세부종목만 보기
                                </label>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                                전체 {sportEvents.length}개 중 {filteredSportEvents.length}개 표시
                            </div>
                    </div>

                    {/* Event List */}
                    {filteredSportEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            표시할 세부종목이 없습니다.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>세부종목</TableHead>
                                        <TableHead>종목</TableHead>
                                        <TableHead>종별</TableHead>
                                        <TableHead>상태</TableHead>
                                        <TableHead className="text-right">설정된 순위 수</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSportEvents.map((event, eventIndex) => {
                                        const eventConfigs = getEventConfigs(event.id);
                                        const isConfigured = eventConfigs.length > 0;
                                        const isExpanded = expandedEvents.has(event.id);

                                        return (
                                            <Fragment key={`${event.id}-${eventIndex}`}>
                                                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(event.id)}>
                                                    <TableCell>
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{event.event_name}</TableCell>
                                                    <TableCell>{getSportName(event.sport_id)}</TableCell>
                                                    <TableCell>{event.division}</TableCell>
                                                    <TableCell>
                                                        {isConfigured ? (
                                                            <Badge variant="default">설정됨</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">미설정</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {eventConfigs.length}개
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="bg-muted/20 p-4">
                                                            {!isConfigured ? (
                                                                <div className="text-center py-4">
                                                                    <p className="text-muted-foreground mb-4">
                                                                        이 세부종목에는 아직 순위별 점수가 설정되지 않았습니다.
                                                                    </p>
                                                                    <Button
                                                                        onClick={() => {
                                                                            setAddEventId(event.id);
                                                                            setShowAddDialog(true);
                                                                        }}
                                                                    >
                                                                        <Plus className="mr-2 h-4 w-4" />
                                                                        순위 추가하기
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>순위</TableHead>
                                                                        <TableHead className="text-right">획득성적 점수</TableHead>
                                                                        <TableHead className="text-right">메달점수</TableHead>
                                                                        <TableHead className="w-[100px]">액션</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {eventConfigs.map(config => (
                                                                        <TableRow key={config.id}>
                                                                            <TableCell className="font-medium">{config.rank_label || formatRankLabel(config.rank)}</TableCell>
                                                                            <TableCell className="text-right">
                                                                                {editingId === config.id ? (
                                                                                    <Input
                                                                                        type="number"
                                                                                        value={editAcquiredScore}
                                                                                        onChange={(e) => setEditAcquiredScore(parseFloat(e.target.value) || 0)}
                                                                                        className="w-24 ml-auto"
                                                                                    />
                                                                                ) : (
                                                                                    config.acquired_score
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                {editingId === config.id ? (
                                                                                    <Input
                                                                                        type="number"
                                                                                        value={editMedalScore}
                                                                                        onChange={(e) => setEditMedalScore(parseFloat(e.target.value) || 0)}
                                                                                        className="w-24 ml-auto"
                                                                                    />
                                                                                ) : (
                                                                                    config.medal_score
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {editingId === config.id ? (
                                                                                    <div className="flex gap-1">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => handleEditSave(config.id)}
                                                                                            disabled={saving}
                                                                                        >
                                                                                            <Check className="h-4 w-4" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => setEditingId(null)}
                                                                                            disabled={saving}
                                                                                        >
                                                                                            <X className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex gap-1">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => handleEditStart(config)}
                                                                                        >
                                                                                            <Pencil className="h-4 w-4" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => setDeleteId(config.id)}
                                                                                            className="text-red-600"
                                                                                        >
                                                                                            <Trash className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                )}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Add Dialog */}
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>순위별 점수 일괄등록</DialogTitle>
                        <DialogDescription>
                            종목 단위로 여러 세부종목에 순위별 점수를 한번에 등록합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* 계층적 선택 */}
                        <div className="rounded-lg border border-border/50 p-4 bg-accent/20">
                            <Label className="text-sm font-semibold mb-3 block">대상 선택 (계층적)</Label>
                            <div className="grid gap-3">
                                <div className="grid gap-2">
                                    <Label className="text-xs">1단계: 종목 선택</Label>
                                    <Select value={bulkSportId} onValueChange={(val) => {
                                        setBulkSportId(val);
                                        setBulkDivision("");
                                        setBulkEventId("");
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="종목 선택 (필수)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sports.map(sport => (
                                                <SelectItem key={sport.id} value={sport.id}>
                                                    {sport.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {bulkSportId && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label className="text-xs">
                                                2단계: 종별 선택 (선택사항)
                                                <span className="text-muted-foreground ml-1">- 전체 선택 시 모든 종별 적용</span>
                                            </Label>
                                            <Select value={bulkDivision} onValueChange={(val) => {
                                                setBulkDivision(val);
                                                setBulkEventId("all");
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="전체 종별" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">전체 종별</SelectItem>
                                                    {bulkDivisions.map(div => (
                                                        <SelectItem key={div} value={div}>
                                                            {div}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label className="text-xs">
                                                3단계: 세부종목 선택 (선택사항)
                                                <span className="text-muted-foreground ml-1">- 전체 선택 시 모든 세부종목 적용</span>
                                            </Label>
                                            <div className="space-y-2">
                                                <Input
                                                    placeholder="세부종목 검색..."
                                                    value={bulkSearchTerm}
                                                    onChange={(e) => setBulkSearchTerm(e.target.value)}
                                                    className="w-full"
                                                />
                                                <Select value={bulkEventId} onValueChange={setBulkEventId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="전체 세부종목" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">전체 세부종목</SelectItem>
                                                        {bulkFilteredEvents.map(event => (
                                                            <SelectItem key={event.id} value={event.id}>
                                                                {getEventFullName(event)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {bulkSportId && (
                                <div className="mt-3 p-2 rounded bg-primary/10 text-sm">
                                    <span className="font-semibold">적용 대상:</span>{' '}
                                    {bulkEventId && bulkEventId !== "all" ? (
                                        <span className="text-primary">
                                            세부종목 1개
                                        </span>
                                    ) : bulkDivision && bulkDivision !== "all" ? (
                                        <span className="text-primary">
                                            {getSportName(bulkSportId)} - {bulkDivision} 의 모든 세부종목 (
                                            {sportEvents.filter(e => e.sport_id === bulkSportId && e.division === bulkDivision).length}개)
                                        </span>
                                    ) : (
                                        <span className="text-primary">
                                            {getSportName(bulkSportId)} 의 모든 세부종목 (
                                            {sportEvents.filter(e => e.sport_id === bulkSportId).length}개)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>등록할 순위 수</Label>
                            <Select
                                value={bulkMaxRank.toString()}
                                onValueChange={(v) => handleBulkMaxRankChange(parseInt(v))}
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
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">순위</TableHead>
                                        <TableHead>획득성적 점수</TableHead>
                                        <TableHead>메달점수</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bulkScores.map((score) => (
                                        <TableRow key={score.rank}>
                                            <TableCell className="font-medium">{score.rank}위</TableCell>
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
                            {bulkScores.length}개 등록
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
