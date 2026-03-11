"use client";

import { useState } from "react";
import { Sport } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DIVISION_LIST } from "@/lib/constants";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mutateJson, toUserErrorMessage } from "@/lib/api-client";

const formSchema = z.object({
    sport_id: z.string().optional(),
    sport_name: z.string().min(1, "종목명을 입력하세요"),
    max_score: z.number().min(0, "확정점수를 입력하세요"),
});

interface SportFormProps {
    initialData?: Sport;
    onSuccess: () => void;
}

interface SportEventInput {
    division: string;
    event_name: string;
}

export function SportForm({ initialData, onSuccess }: SportFormProps) {
    const router = useRouter();
    const [events, setEvents] = useState<SportEventInput[]>([
        { division: "", event_name: "" }
    ]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            sport_id: initialData?.id || "",
            sport_name: initialData?.name || "",
            max_score: initialData?.max_score || 0,
        },
    });

    const addEvent = () => {
        setEvents([...events, { division: "", event_name: "" }]);
    };

    const removeEvent = (index: number) => {
        if (events.length > 1) {
            setEvents(events.filter((_, i) => i !== index));
        }
    };

    const updateEvent = (index: number, field: keyof SportEventInput, value: string) => {
        const newEvents = [...events];
        newEvents[index][field] = value;
        setEvents(newEvents);
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // Validate events
        const validEvents = events.filter(e => e.division && e.event_name);
        if (validEvents.length === 0) {
            toast.error("최소 하나의 종별과 세부종목을 입력하세요.");
            return;
        }

        try {
            // 1. 먼저 종목 생성
            const sportData = await mutateJson<{ data: Sport }>("/api/sports", {
                method: "POST",
                body: {
                    id: values.sport_id || undefined,
                    name: values.sport_name,
                    sub_name: "",
                    max_score: values.max_score,
                },
            });
            const newSportId = sportData.data.id;

            // 2. 세부종목들을 모두 생성
            const eventPromises = validEvents.map(event =>
                mutateJson("/api/sport-events", {
                    method: "POST",
                    body: {
                        sport_id: newSportId,
                        division: event.division,
                        event_name: event.event_name,
                    },
                })
            );

            await Promise.all(eventPromises);

            toast.success(`종목과 ${validEvents.length}개의 세부종목이 등록되었습니다.`);
            router.refresh();
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error(toUserErrorMessage(error, "저장에 실패했습니다."));
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="sport_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>종목 ID (선택)</FormLabel>
                            <FormControl>
                                <Input placeholder="예: track (비워두면 자동 생성)" {...field} />
                            </FormControl>
                            <FormDescription>
                                고유한 종목 ID를 입력하거나 비워두면 자동 생성됩니다.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="sport_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>종목명</FormLabel>
                            <FormControl>
                                <Input placeholder="예: 육상트랙, 육상필드" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="max_score"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>확정점수</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                            </FormControl>
                            <FormDescription>
                                이 종목의 전체 확정점수입니다.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <FormLabel>세부종목</FormLabel>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addEvent}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            추가
                        </Button>
                    </div>
                    <FormDescription>
                        종별과 세부종목을 여러 개 추가할 수 있습니다.
                    </FormDescription>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                        {events.map((event, index) => (
                            <div key={index} className="flex gap-2 items-start p-2 bg-accent/20 rounded-md">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                    <Select
                                        value={event.division}
                                        onValueChange={(value) => updateEvent(index, 'division', value)}
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
                                        onChange={(e) => updateEvent(index, 'event_name', e.target.value)}
                                    />
                                </div>
                                {events.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => removeEvent(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    {events.filter(e => e.division && e.event_name).length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            <Badge variant="secondary">
                                {events.filter(e => e.division && e.event_name).length}개 세부종목
                            </Badge>
                        </div>
                    )}
                </div>

                <Button type="submit" className="w-full">
                    등록하기
                </Button>
            </form>
        </Form>
    );
}
