"use client";

import { Score, Sport, Region, RankScoreConfig, SportEvent } from "@/types";
import { RecordType, calculateConfirmedBonus } from "@/lib/record-types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { GYEONGGI_REGION_ID, DIVISION_LIST } from "@/lib/constants";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";

const scoreSchema = z.object({
    sport_id: z.string().min(1, "종목을 선택하세요"),
    sport_event_id: z.string().optional(),
    region_id: z.string().min(1, "시도를 선택하세요"),
    division: z.enum(["남고", "여고", "고등", "남대", "여대", "대학", "남일", "여일", "일반"], "종별을 선택하세요"),
    expected_rank: z.number().int().min(0).max(20).optional(),
    rank: z.number().int().min(0).max(20).optional(),
    expected_score: z.number().min(0),
    expected_medal_score: z.number().min(0).optional(),
    actual_score: z.number().min(0).optional(),
    actual_medal_score: z.number().min(0).optional(),
    sub_event_total: z.number().min(0).optional(),
    converted_score: z.number().min(0).optional(),
    confirmed_bonus: z.number().min(0).optional(),
    record_type: z.string().optional(),
    total_score: z.number().min(0).optional(),
    gold: z.number().int().min(0).optional(),
    silver: z.number().int().min(0).optional(),
    bronze: z.number().int().min(0).optional(),
});

interface ScoreFormProps {
    initialData?: Score;
    sports: Sport[];
    regions: Region[];
    onSuccess: () => void;
}

export function ScoreForm({ initialData, sports, regions, onSuccess }: ScoreFormProps) {
    const router = useRouter();
    const [rankScoreConfigs, setRankScoreConfigs] = useState<RankScoreConfig[]>([]);
    const [sportEvents, setSportEvents] = useState<SportEvent[]>([]);
    const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
    const [loadingConfigs, setLoadingConfigs] = useState(true);
    const [loadingEvents, setLoadingEvents] = useState(true);

    // Fetch rank score configs, sport events, and record types
    useEffect(() => {
        async function fetchData() {
            try {
                const [configsRes, eventsRes, recordTypesRes] = await Promise.all([
                    fetch("/api/configs/rank-score"),
                    fetch("/api/sport-events"),
                    fetch("/api/record-types"),
                ]);

                if (configsRes.ok) {
                    const data = await configsRes.json();
                    setRankScoreConfigs(data.data || []);
                }

                if (eventsRes.ok) {
                    const data = await eventsRes.json();
                    setSportEvents(data.data || []);
                }

                if (recordTypesRes.ok) {
                    const data = await recordTypesRes.json();
                    if (data.data && data.data.length > 0) {
                        setRecordTypes(data.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoadingConfigs(false);
                setLoadingEvents(false);
            }
        }
        fetchData();
    }, []);

    const form = useForm<z.infer<typeof scoreSchema>>({
        resolver: zodResolver(scoreSchema),
        defaultValues: {
            sport_id: initialData?.sport_id || "",
            sport_event_id: initialData?.sport_event_id || "",
            region_id: initialData?.region_id || GYEONGGI_REGION_ID,
            division: initialData?.division || "남고",
            expected_rank: initialData?.expected_rank ? Number(initialData.expected_rank) : undefined,
            rank: initialData?.rank ? Number(initialData.rank) : undefined,
            expected_score: initialData?.expected_score ?? 0,
            expected_medal_score: initialData?.expected_medal_score ?? 0,
            actual_score: initialData?.actual_score ?? 0,
            actual_medal_score: initialData?.actual_medal_score ?? 0,
            sub_event_total: initialData?.sub_event_total ?? undefined,
            converted_score: initialData?.converted_score ?? 0,
            confirmed_bonus: initialData?.confirmed_bonus ?? 0,
            record_type: initialData?.record_type || "none",
            total_score: initialData?.total_score ?? 0,
            gold: initialData?.gold ?? 0,
            silver: initialData?.silver ?? 0,
            bronze: initialData?.bronze ?? 0,
        },
    });

    // Watch form fields
    const selectedSportId = form.watch("sport_id");
    const selectedDivision = form.watch("division");
    const expectedRank = form.watch("expected_rank");
    const selectedRank = form.watch("rank");
    const selectedEventId = form.watch("sport_event_id");
    const recordType = form.watch("record_type");
    const actualScore = form.watch("actual_score");

    // Filter events by sport and division
    const availableEvents = useMemo(() => {
        if (!selectedSportId || !selectedDivision) return [];
        return sportEvents.filter(
            (event) => event.sport_id === selectedSportId && event.division === selectedDivision
        );
    }, [selectedSportId, selectedDivision, sportEvents]);

    // Auto-clear event selection when sport or division changes
    useEffect(() => {
        const currentEventId = form.getValues("sport_event_id");
        if (currentEventId && availableEvents.length > 0) {
            const eventStillValid = availableEvents.some((e) => e.id === currentEventId);
            if (!eventStillValid) {
                form.setValue("sport_event_id", "");
            }
        }
    }, [selectedSportId, selectedDivision, availableEvents, form]);

    // Watch expected rank to auto-calculate expected scores
    useEffect(() => {
        if (expectedRank && expectedRank > 0 && rankScoreConfigs.length > 0 && selectedEventId) {
            const config = rankScoreConfigs.find(
                (c) => c.rank === String(expectedRank) && c.sport_event_id === selectedEventId
            );
            if (config) {
                form.setValue("expected_score", config.acquired_score);
                form.setValue("expected_medal_score", config.medal_score);
            }
        }
    }, [expectedRank, selectedEventId, rankScoreConfigs, form]);

    // Watch rank to auto-calculate actual scores
    useEffect(() => {
        if (selectedRank && selectedRank > 0 && rankScoreConfigs.length > 0 && selectedEventId) {
            const config = rankScoreConfigs.find(
                (c) => c.rank === String(selectedRank) && c.sport_event_id === selectedEventId
            );
            if (config) {
                form.setValue("actual_score", config.acquired_score);
                form.setValue("actual_medal_score", config.medal_score);

                // Auto-set medals based on rank
                if (selectedRank === 1) {
                    form.setValue("gold", 1);
                    form.setValue("silver", 0);
                    form.setValue("bronze", 0);
                } else if (selectedRank === 2) {
                    form.setValue("gold", 0);
                    form.setValue("silver", 1);
                    form.setValue("bronze", 0);
                } else if (selectedRank === 3) {
                    form.setValue("gold", 0);
                    form.setValue("silver", 0);
                    form.setValue("bronze", 1);
                } else {
                    form.setValue("gold", 0);
                    form.setValue("silver", 0);
                    form.setValue("bronze", 0);
                }
            }
        }
    }, [selectedRank, selectedEventId, rankScoreConfigs, form]);

    // Auto-calculate confirmed_bonus and total_score when actual_score or record_type changes
    useEffect(() => {
        const currentActualScore = actualScore || 0;
        const medalScore = form.getValues("actual_medal_score") || 0;

        // Calculate confirmed bonus based on record type
        const confirmedBonus = calculateConfirmedBonus(currentActualScore, recordType || "none");
        form.setValue("confirmed_bonus", confirmedBonus);

        // Calculate total score
        const totalScore = currentActualScore + medalScore + confirmedBonus;
        form.setValue("total_score", totalScore);
    }, [actualScore, recordType, form]);

    async function onSubmit(values: z.infer<typeof scoreSchema>) {
        try {
            const url = initialData ? `/api/scores/${initialData.id}` : "/api/scores";
            const method = initialData ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error("Failed");

            toast.success(initialData ? "수정되었습니다." : "등록되었습니다.");
            router.refresh();
            onSuccess();
        } catch (error) {
            toast.error("저장에 실패했습니다.");
        }
    }

    // Generate rank options (0 = 미선택, 1-20)
    const rankOptions = [
        { value: 0, label: "순위 미선택" },
        ...Array.from({ length: 20 }, (_, i) => ({
            value: i + 1,
            label: `${i + 1}위`,
        })),
    ];

    // Get score info for selected rank
    const getSelectedRankInfo = (rank: number | undefined) => {
        if (!rank || rank === 0 || !selectedEventId) return null;
        const config = rankScoreConfigs.find(
            (c) => c.rank === String(rank) && c.sport_event_id === selectedEventId
        );
        if (!config) return { notConfigured: true };
        return config;
    };

    const expectedRankInfo = getSelectedRankInfo(expectedRank);
    const actualRankInfo = getSelectedRankInfo(selectedRank);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="sport_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>종목</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="종목 선택" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {sports.map((sport) => (
                                        <SelectItem key={sport.id} value={sport.id}>
                                            {sport.name}
                                            {sport.sub_name && ` (${sport.sub_name})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* 경기도 담당자 모드: region_id는 경기도로 자동 설정 */}
                <input type="hidden" {...form.register("region_id")} value={GYEONGGI_REGION_ID} />
                <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium">시도:</span> 경기도 (자동 설정)
                    </p>
                </div>

                <FormField
                    control={form.control}
                    name="division"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>종별</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="종별 선택" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {DIVISION_LIST.map((division) => (
                                        <SelectItem key={division} value={division}>
                                            {division}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* 세부종목 선택 */}
                <FormField
                    control={form.control}
                    name="sport_event_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>세부종목 (선택)</FormLabel>
                            {loadingEvents ? (
                                <div className="flex items-center gap-2 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm text-muted-foreground">세부종목 로딩 중...</span>
                                </div>
                            ) : availableEvents.length > 0 ? (
                                <>
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="세부종목 선택 (선택사항)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableEvents.map((event) => (
                                                <SelectItem key={event.id} value={event.id}>
                                                    {event.event_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        선택한 종목/종별에 해당하는 세부종목입니다.
                                    </FormDescription>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground py-2">
                                    해당 종목/종별에 등록된 세부종목이 없습니다.
                                </div>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* 세부종목별 전체점수합계 (전국 17개 시도 합계) */}
                <FormField
                    control={form.control}
                    name="sub_event_total"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-purple-700 font-semibold">
                                세부종목별 전체점수합계
                                <span className="text-muted-foreground font-normal ml-2 text-xs">(경기 종료 후 입력)</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.1"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={e => {
                                        const val = e.target.value;
                                        field.onChange(val === "" ? undefined : parseFloat(val) || 0);
                                    }}
                                    placeholder="전국 17개 시도의 획득성적 합계"
                                    className="bg-purple-50 border-purple-200"
                                />
                            </FormControl>
                            <FormDescription className="text-purple-600">
                                해당 세부종목에서 전국 17개 시도가 얻은 획득성적의 합계를 입력하세요.
                                <br />
                                <span className="text-orange-600 font-medium">
                                    환산점수는 점수관리 페이지에서 "환산점수 계산하기" 버튼으로 일괄 계산됩니다.
                                </span>
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold mb-3 text-green-700">예상 성적</h3>

                    {/* 예상 순위 */}
                    <div className="border rounded-lg p-4 bg-green-50/50 mb-4">
                        <FormField
                            control={form.control}
                            name="expected_rank"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-green-700 font-semibold">예상 순위 (자동 계산)</FormLabel>
                                    {loadingConfigs ? (
                                        <div className="flex items-center gap-2 py-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm text-muted-foreground">순위 설정 로딩 중...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Select
                                                onValueChange={(val) => field.onChange(parseInt(val))}
                                                value={field.value?.toString() || "0"}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="예상 순위 선택" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {rankOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value.toString()}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {selectedEventId && expectedRankInfo && !('notConfigured' in expectedRankInfo) && (
                                                <FormDescription className="text-green-600 font-medium">
                                                    예상 획득성적: {expectedRankInfo.acquired_score}점 / 예상 메달점수: {expectedRankInfo.medal_score}점
                                                </FormDescription>
                                            )}
                                        </>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* 예상 점수 (자동 계산됨) */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="expected_score"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        예상 득점
                                        {expectedRank && expectedRank > 0 && selectedEventId && (
                                            <span className="text-green-600 ml-1">(자동)</span>
                                        )}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            {...field}
                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                            className={expectedRank && expectedRank > 0 && selectedEventId ? "bg-green-50 border-green-200" : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="expected_medal_score"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        예상 메달득점
                                        {expectedRank && expectedRank > 0 && selectedEventId && (
                                            <span className="text-green-600 ml-1">(자동)</span>
                                        )}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            {...field}
                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                            className={expectedRank && expectedRank > 0 && selectedEventId ? "bg-green-50 border-green-200" : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold mb-3 text-blue-700">실제 성적</h3>

                    {/* 실제 순위 (자동 점수 계산) */}
                    <div className="border rounded-lg p-4 bg-blue-50/50 mb-4">
                        <FormField
                            control={form.control}
                            name="rank"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-blue-700 font-semibold">실제 순위 (자동 점수 계산)</FormLabel>
                                    {loadingConfigs ? (
                                        <div className="flex items-center gap-2 py-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm text-muted-foreground">순위 설정 로딩 중...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Select
                                                onValueChange={(val) => field.onChange(parseInt(val))}
                                                value={field.value?.toString() || "0"}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="실제 순위 선택" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {rankOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value.toString()}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {!selectedEventId && selectedRank && selectedRank > 0 && (
                                                <FormDescription className="text-orange-600">
                                                    세부종목을 선택하면 자동 점수 계산이 가능합니다.
                                                </FormDescription>
                                            )}
                                            {selectedEventId && actualRankInfo && !('notConfigured' in actualRankInfo) && (
                                                <FormDescription className="text-blue-600 font-medium">
                                                    획득성적: {actualRankInfo.acquired_score}점 / 메달점수: {actualRankInfo.medal_score}점 자동 적용
                                                </FormDescription>
                                            )}
                                            {selectedEventId && actualRankInfo && 'notConfigured' in actualRankInfo && (
                                                <FormDescription className="text-orange-600">
                                                    해당 세부종목/순위에 대한 점수 설정이 없습니다.
                                                </FormDescription>
                                            )}
                                        </>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* 실제 점수 (순위 선택 시 자동 계산) */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="actual_score"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        실제 득점 (획득성적)
                                        {selectedRank && selectedRank > 0 && selectedEventId && (
                                            <span className="text-blue-600 ml-1">(자동)</span>
                                        )}
                                        {recordType && recordType !== "none" && (
                                            <span className="text-orange-600 ml-1">(신기록 가산)</span>
                                        )}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            {...field}
                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                            className={selectedRank && selectedRank > 0 && selectedEventId ? "bg-blue-50 border-blue-200" : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="actual_medal_score"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        실제 메달득점
                                        {selectedRank && selectedRank > 0 && selectedEventId && (
                                            <span className="text-blue-600 ml-1">(자동)</span>
                                        )}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            {...field}
                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                            className={selectedRank && selectedRank > 0 && selectedEventId ? "bg-blue-50 border-blue-200" : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* 신기록 타입 선택 */}
                <FormField
                    control={form.control}
                    name="record_type"
                    render={({ field }) => (
                        <FormItem className="border rounded-lg p-4 bg-orange-50/50">
                            <FormLabel className="text-orange-700 font-semibold">
                                신기록 타입
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                                <FormControl>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="신기록 타입 선택" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {recordTypes.map((recordType) => (
                                        <SelectItem key={recordType.id} value={recordType.id}>
                                            {recordType.name}
                                            {recordType.bonus_percentage > 0 && (
                                                <span className="text-orange-600 ml-2">
                                                    ({recordType.bonus_percentage}% 가산)
                                                </span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {field.value && field.value !== "none" && (() => {
                                const selectedRecord = recordTypes.find(r => r.id === field.value);
                                if (selectedRecord) {
                                    return (
                                        <FormDescription className="text-orange-600 font-medium">
                                            {selectedRecord.name}: 획득성적에 {selectedRecord.bonus_percentage}% 가산 적용
                                        </FormDescription>
                                    );
                                }
                            })()}
                            {(!field.value || field.value === "none") && (
                                <FormDescription className="text-muted-foreground">
                                    신기록이 없으면 "해당없음"을 선택하세요.
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* 가산점 및 총점 */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="confirmed_bonus"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    확정자가산
                                    <span className="text-orange-600 ml-1">(자동)</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        {...field}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="bg-orange-50 border-orange-200 font-semibold"
                                        readOnly
                                    />
                                </FormControl>
                                <FormDescription className="text-orange-600">
                                    신기록 타입에 따라 자동 계산됩니다.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="total_score"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    총 득점
                                    <span className="text-blue-600 ml-1">(자동)</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        {...field}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                        className="bg-green-50 border-green-200 font-semibold"
                                    />
                                </FormControl>
                                <FormDescription>
                                    획득성적 + 메달득점 + 확정자가산
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* 메달 */}
                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="gold"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    금메달
                                    {selectedRank === 1 && (
                                        <span className="text-yellow-600 ml-1">(자동)</span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                        className={selectedRank === 1 ? "bg-yellow-50 border-yellow-200" : ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="silver"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    은메달
                                    {selectedRank === 2 && (
                                        <span className="text-gray-500 ml-1">(자동)</span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                        className={selectedRank === 2 ? "bg-gray-50 border-gray-200" : ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="bronze"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    동메달
                                    {selectedRank === 3 && (
                                        <span className="text-orange-600 ml-1">(자동)</span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                        className={selectedRank === 3 ? "bg-orange-50 border-orange-200" : ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* 환산점수 필드 (읽기 전용, 점수관리 페이지에서 계산) */}
                <FormField
                    control={form.control}
                    name="converted_score"
                    render={({ field }) => (
                        <FormItem className="border rounded-lg p-4 bg-gray-50/50">
                            <FormLabel className="text-gray-600 font-semibold">
                                환산점수 (점수관리 페이지에서 계산)
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    className="bg-gray-100 border-gray-300 text-gray-600"
                                    readOnly
                                />
                            </FormControl>
                            <FormDescription className="text-gray-600">
                                환산점수는 점수관리 페이지의 "환산점수 계산하기" 버튼으로 일괄 계산됩니다.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full">
                    {initialData ? "수정하기" : "등록하기"}
                </Button>
            </form>
        </Form>
    );
}
