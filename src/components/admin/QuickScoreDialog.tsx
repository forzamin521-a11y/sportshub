"use client";

import { useState, useEffect } from "react";
import { Sport, Region, SportEvent } from "@/types";
import { GYEONGGI_REGION_ID } from "@/lib/constants";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuickScoreDialogProps {
    event: SportEvent;
    sports: Sport[];
    regions: Region[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function QuickScoreDialog({
    event,
    sports,
    open,
    onOpenChange,
    onSuccess,
}: QuickScoreDialogProps) {
    const [loading, setLoading] = useState(false);
    const [rankConfigExists, setRankConfigExists] = useState<boolean | null>(null);
    const [formData, setFormData] = useState({
        expected_score: 0,
        actual_score: 0,
        actual_medal_score: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        rank: 0,
    });

    const sportName = sports.find(s => s.id === event.sport_id)?.name || event.sport_id;

    // Check if rank config exists and calculate scores when rank changes
    useEffect(() => {
        async function checkAndCalculate() {
            if (!formData.rank || formData.rank <= 0) {
                return;
            }

            try {
                // Fetch rank config
                const res = await fetch(`/api/configs/rank-score`);
                if (!res.ok) return;

                const data = await res.json();
                const configs = data.data || [];

                // Find config for this event and rank
                const config = configs.find(
                    (c: any) => c.sport_event_id === event.id && c.rank === formData.rank
                );

                if (config) {
                    setRankConfigExists(true);
                    // Auto-fill scores based on rank config
                    const gold = formData.rank === 1 ? 1 : 0;
                    const silver = formData.rank === 2 ? 1 : 0;
                    const bronze = formData.rank === 3 ? 1 : 0;

                    setFormData(prev => ({
                        ...prev,
                        actual_score: config.acquired_score || 0,
                        actual_medal_score: config.medal_score || 0,
                        gold,
                        silver,
                        bronze,
                    }));
                } else {
                    setRankConfigExists(false);
                    // Just set medals based on rank
                    const gold = formData.rank === 1 ? 1 : 0;
                    const silver = formData.rank === 2 ? 1 : 0;
                    const bronze = formData.rank === 3 ? 1 : 0;
                    setFormData(prev => ({
                        ...prev,
                        gold,
                        silver,
                        bronze,
                    }));
                }
            } catch (error) {
                console.error("Failed to check rank config:", error);
            }
        }

        checkAndCalculate();
    }, [formData.rank, event.id]);

    const handleSubmit = async () => {
        setLoading(true);

        try {
            const res = await fetch("/api/scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sport_id: event.sport_id,
                    sport_event_id: event.id,
                    region_id: GYEONGGI_REGION_ID,
                    division: event.division,
                    expected_score: formData.expected_score,
                    actual_score: formData.actual_score,
                    actual_medal_score: formData.actual_medal_score,
                    gold: formData.gold,
                    silver: formData.silver,
                    bronze: formData.bronze,
                    rank: formData.rank || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create score");
            }

            toast.success("점수가 등록되었습니다.");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("등록 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const totalScore = (formData.actual_score || 0) + (formData.actual_medal_score || 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[95vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>빠른 점수 입력</DialogTitle>
                    <DialogDescription>
                        {sportName} - {event.division} - {event.event_name}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6">
                    <div className="grid gap-4 py-4">
                    {/* Rank Input - Primary */}
                    <div className="space-y-2 p-3 bg-blue-500/10 rounded-xl border border-blue-200/50">
                        <Label className="text-blue-700 font-semibold text-xs">순위 입력 (자동 계산)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={17}
                            placeholder="순위를 입력하세요"
                            value={formData.rank || ""}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                rank: parseInt(e.target.value) || 0
                            }))}
                            className="text-lg font-semibold"
                        />
                        {formData.rank > 0 && rankConfigExists === false && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    이 세부종목의 {formData.rank}위에 대한 순위별 점수 설정이 없습니다.
                                    설정 페이지에서 먼저 등록하거나 아래에서 직접 입력하세요.
                                </AlertDescription>
                            </Alert>
                        )}
                        {formData.rank > 0 && rankConfigExists === true && (
                            <p className="text-sm text-green-600">
                                순위별 점수 설정에서 자동으로 계산되었습니다.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>예상점수</Label>
                            <Input
                                type="number"
                                value={formData.expected_score}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    expected_score: parseFloat(e.target.value) || 0
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>획득성적</Label>
                            <Input
                                type="number"
                                value={formData.actual_score}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    actual_score: parseFloat(e.target.value) || 0
                                }))}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>메달점수</Label>
                            <Input
                                type="number"
                                value={formData.actual_medal_score}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    actual_medal_score: parseFloat(e.target.value) || 0
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>총득점</Label>
                            <Input
                                type="number"
                                value={totalScore}
                                disabled
                                className="bg-gray-100 font-semibold"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>금</Label>
                            <Input
                                type="number"
                                value={formData.gold}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    gold: parseInt(e.target.value) || 0
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>은</Label>
                            <Input
                                type="number"
                                value={formData.silver}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    silver: parseInt(e.target.value) || 0
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>동</Label>
                            <Input
                                type="number"
                                value={formData.bronze}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    bronze: parseInt(e.target.value) || 0
                                }))}
                            />
                        </div>
                    </div>
                    </div>
                </div>
                <DialogFooter className="px-6 pb-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        취소
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        등록
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
