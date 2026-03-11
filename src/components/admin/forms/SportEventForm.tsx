"use client";

import { SportEvent, Division } from "@/types";
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
import { sportEventSchema } from "@/lib/validations";
import { DIVISION_LIST } from "@/lib/constants";
import { mutateJson, toUserErrorMessage } from "@/lib/api-client";

interface SportEventFormProps {
    sportId: string;
    defaultDivision?: Division;
    initialData?: SportEvent;
    onSuccess: () => void;
}

export function SportEventForm({ sportId, defaultDivision, initialData, onSuccess }: SportEventFormProps) {
    const router = useRouter();
    const form = useForm<z.infer<typeof sportEventSchema>>({
        resolver: zodResolver(sportEventSchema),
        defaultValues: {
            id: initialData?.id || "",
            sport_id: sportId,
            division: initialData?.division || defaultDivision || "남고",
            event_name: initialData?.event_name || "",
            max_score: initialData?.max_score || undefined,
        },
    });

    async function onSubmit(values: z.infer<typeof sportEventSchema>) {
        try {
            const url = initialData
                ? `/api/sport-events/${initialData.id}`
                : "/api/sport-events";
            const method = initialData ? "PUT" : "POST";

            await mutateJson(url, {
                method,
                body: values,
            });

            toast.success(initialData ? "수정되었습니다." : "등록되었습니다.");
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
                    name="division"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>종별</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={!!initialData}
                            >
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

                <FormField
                    control={form.control}
                    name="event_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>세부종목명</FormLabel>
                            <FormControl>
                                <Input placeholder="예: 100m, 높이뛰기" {...field} />
                            </FormControl>
                            <FormDescription>
                                세부종목의 이름을 입력하세요.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="max_score"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>점수 (선택)</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="예: 1000"
                                    value={field.value || ""}
                                    onChange={(e) =>
                                        field.onChange(
                                            e.target.value ? parseFloat(e.target.value) : undefined
                                        )
                                    }
                                />
                            </FormControl>
                            <FormDescription>
                                세부종목별 점수가 있는 경우 입력하세요.
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
