"use client";

import { useState, useEffect } from "react";
import { Sport, SportEvent } from "@/types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DIVISION_LIST } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditSportDialogProps {
    sport: Sport;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface SportEventWithId extends SportEvent {
    isNew?: boolean;
    isDeleted?: boolean;
}

export function EditSportDialog({ sport, open, onOpenChange }: EditSportDialogProps) {
    const router = useRouter();
    const [name, setName] = useState(sport.name);
    const [subName, setSubName] = useState(sport.sub_name || "");
    const [maxScore, setMaxScore] = useState(sport.max_score);
    const [events, setEvents] = useState<SportEventWithId[]>([]);
    const [newEvents, setNewEvents] = useState<{ division: string; event_name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load existing events
    useEffect(() => {
        if (open) {
            loadEvents();
        }
    }, [open, sport.id]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sport-events?sport_id=${sport.id}`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data.data || []);
            }
        } catch (error) {
            console.error("Failed to load events:", error);
        } finally {
            setLoading(false);
        }
    };

    const addNewEvent = () => {
        setNewEvents([...newEvents, { division: "", event_name: "" }]);
    };

    const removeNewEvent = (index: number) => {
        setNewEvents(newEvents.filter((_, i) => i !== index));
    };

    const updateNewEvent = (index: number, field: "division" | "event_name", value: string) => {
        const updated = [...newEvents];
        updated[index][field] = value;
        setNewEvents(updated);
    };

    const markEventForDeletion = (eventId: string) => {
        setEvents(events.map(e =>
            e.id === eventId ? { ...e, isDeleted: !e.isDeleted } : e
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // 1. Update sport info
            const sportRes = await fetch(`/api/sports/${sport.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    sub_name: subName,
                    max_score: maxScore,
                }),
            });

            if (!sportRes.ok) {
                throw new Error("종목 정보 수정 실패");
            }

            // 2. Delete marked events
            const eventsToDelete = events.filter(e => e.isDeleted);
            for (const event of eventsToDelete) {
                await fetch(`/api/sport-events/${event.id}`, {
                    method: "DELETE",
                });
            }

            // 3. Create new events
            const validNewEvents = newEvents.filter(e => e.division && e.event_name);
            for (const event of validNewEvents) {
                await fetch("/api/sport-events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sport_id: sport.id,
                        division: event.division,
                        event_name: event.event_name,
                    }),
                });
            }

            toast.success(`종목이 수정되었습니다. (${validNewEvents.length}개 추가, ${eventsToDelete.length}개 삭제)`);
            router.refresh();
            onOpenChange(false);

            // Reset states
            setNewEvents([]);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "수정에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>종목 수정</DialogTitle>
                    <DialogDescription>
                        종목 정보와 세부종목을 수정합니다.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="basic">기본 정보</TabsTrigger>
                        <TabsTrigger value="events">
                            세부종목
                            <Badge variant="secondary" className="ml-2">
                                {events.filter(e => !e.isDeleted).length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">종목명</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="예: 육상트랙"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sub_name">부제목 (선택)</Label>
                            <Input
                                id="sub_name"
                                value={subName}
                                onChange={(e) => setSubName(e.target.value)}
                                placeholder="예: Track & Field"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="max_score">확정점수</Label>
                            <Input
                                id="max_score"
                                type="number"
                                value={maxScore}
                                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                required
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="events" className="space-y-4 mt-4">
                        {/* Existing Events */}
                        <div className="space-y-2">
                            <Label>기존 세부종목</Label>
                            {loading ? (
                                <p className="text-sm text-muted-foreground">로딩 중...</p>
                            ) : events.length === 0 ? (
                                <p className="text-sm text-muted-foreground">등록된 세부종목이 없습니다.</p>
                            ) : (
                                <div className="space-y-1 max-h-[200px] overflow-y-auto border rounded-lg p-2">
                                    {events.map((event) => (
                                        <div
                                            key={event.id}
                                            className={`flex items-center justify-between p-2 rounded ${
                                                event.isDeleted ? "bg-destructive/10 line-through" : "bg-accent/20"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{event.division}</Badge>
                                                <span className="text-sm">{event.event_name}</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant={event.isDeleted ? "outline" : "ghost"}
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => markEventForDeletion(event.id)}
                                            >
                                                {event.isDeleted ? (
                                                    <span className="text-xs">복구</span>
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* New Events */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>새 세부종목 추가</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addNewEvent}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    추가
                                </Button>
                            </div>

                            {newEvents.length > 0 && (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2">
                                    {newEvents.map((event, index) => (
                                        <div key={index} className="flex gap-2 items-start p-2 bg-primary/5 rounded-md">
                                            <div className="flex-1 grid grid-cols-2 gap-2">
                                                <Select
                                                    value={event.division}
                                                    onValueChange={(value) => updateNewEvent(index, 'division', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="종별" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DIVISION_LIST.map((div) => (
                                                            <SelectItem key={div} value={div}>
                                                                {div}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    placeholder="세부종목명"
                                                    value={event.event_name}
                                                    onChange={(e) => updateNewEvent(index, 'event_name', e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9"
                                                onClick={() => removeNewEvent(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {newEvents.filter(e => e.division && e.event_name).length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                    <Badge variant="secondary">
                                        {newEvents.filter(e => e.division && e.event_name).length}개 추가 예정
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        취소
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? "저장 중..." : "저장"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
