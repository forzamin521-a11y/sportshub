"use client";

import { Region } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { regionSchema } from "@/lib/validations";

interface RegionFormProps {
    initialData?: Region;
    onSuccess: () => void;
}

export function RegionForm({ initialData, onSuccess }: RegionFormProps) {
    const router = useRouter();
    const form = useForm<z.infer<typeof regionSchema>>({
        resolver: zodResolver(regionSchema),
        defaultValues: {
            id: initialData?.id || "",
            name: initialData?.name || "",
            is_host: initialData?.is_host || false,
            color: initialData?.color || "#000000",
        },
    });

    async function onSubmit(values: z.infer<typeof regionSchema>) {
        try {
            const url = initialData ? `/api/regions/${initialData.id}` : "/api/regions";
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
            console.error(error);
            toast.error("저장에 실패했습니다.");
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>시도 코드 (ID)</FormLabel>
                            <FormControl>
                                <Input placeholder="예: Seoul" {...field} disabled={!!initialData} />
                            </FormControl>
                            <FormDescription>
                                고유한 시도 코드를 입력하세요. (수정 불가)
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>시도명</FormLabel>
                            <FormControl>
                                <Input placeholder="예: 서울특별시" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="is_host"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">개최지 여부</FormLabel>
                                <FormDescription>
                                    이 시도가 이번 대회의 개최지인가요?
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>색상</FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <Input type="color" className="w-12 p-1 h-10" {...field} />
                                </FormControl>
                                <FormControl>
                                    <Input placeholder="#000000" {...field} />
                                </FormControl>
                            </div>
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
