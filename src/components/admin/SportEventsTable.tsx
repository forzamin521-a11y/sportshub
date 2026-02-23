"use client";

import { useState } from "react";
import { SportEvent, Division } from "@/types";
import { DIVISION_LIST } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Pencil, Trash, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SportEventForm } from "./forms/SportEventForm";

interface SportEventsTableProps {
    sportId: string;
    sportName: string;
    events: SportEvent[];
}

export function SportEventsTable({ sportId, sportName, events }: SportEventsTableProps) {
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingEvent, setEditingEvent] = useState<SportEvent | null>(null);
    const [deletingEvent, setDeletingEvent] = useState<SportEvent | null>(null);
    const [selectedDivision, setSelectedDivision] = useState<Division>("남고");
    const router = useRouter();

    // Group events by division
    const eventsByDivision = DIVISION_LIST.reduce((acc, division) => {
        acc[division] = events.filter((e) => e.division === division);
        return acc;
    }, {} as Record<Division, SportEvent[]>);

    // Get divisions that have events
    const divisionsWithEvents = DIVISION_LIST.filter(
        (division) => eventsByDivision[division].length > 0
    );

    const handleDelete = async () => {
        if (!deletingEvent) return;

        try {
            const res = await fetch(`/api/sport-events/${deletingEvent.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("삭제되었습니다.");
            router.refresh();
        } catch (error) {
            toast.error("삭제에 실패했습니다.");
        } finally {
            setDeletingEvent(null);
        }
    };

    const currentDivisionEvents = eventsByDivision[selectedDivision] || [];

    return (
        <div className="p-4 bg-muted/50 rounded-lg">
            <Tabs
                value={selectedDivision}
                onValueChange={(v) => setSelectedDivision(v as Division)}
            >
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="flex-wrap h-auto">
                        {DIVISION_LIST.map((division) => (
                            <TabsTrigger key={division} value={division} className="text-xs">
                                {division}
                                {eventsByDivision[division].length > 0 && (
                                    <span className="ml-1 text-muted-foreground">
                                        ({eventsByDivision[division].length})
                                    </span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                세부종목 추가
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>세부종목 추가</DialogTitle>
                                <DialogDescription>
                                    {sportName}에 새로운 세부종목을 추가합니다.
                                </DialogDescription>
                            </DialogHeader>
                            <SportEventForm
                                sportId={sportId}
                                defaultDivision={selectedDivision}
                                onSuccess={() => setShowAddDialog(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                {DIVISION_LIST.map((division) => (
                    <TabsContent key={division} value={division}>
                        {eventsByDivision[division].length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {division} 종별에 등록된 세부종목이 없습니다.
                            </div>
                        ) : (
                            <div className="rounded-md border bg-background">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>세부종목</TableHead>
                                            <TableHead className="text-right">점수</TableHead>
                                            <TableHead className="w-[100px]">액션</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {eventsByDivision[division].map((event) => (
                                            <TableRow key={event.id}>
                                                <TableCell className="font-medium">
                                                    {event.event_name}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {event.max_score?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditingEvent(event)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            onClick={() => setDeletingEvent(event)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>

            {/* Edit Dialog */}
            <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>세부종목 수정</DialogTitle>
                        <DialogDescription>
                            세부종목 정보를 수정합니다.
                        </DialogDescription>
                    </DialogHeader>
                    {editingEvent && (
                        <SportEventForm
                            sportId={sportId}
                            initialData={editingEvent}
                            onSuccess={() => setEditingEvent(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingEvent} onOpenChange={() => setDeletingEvent(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다. &quot;{deletingEvent?.event_name}&quot; 세부종목이 영구적으로 삭제됩니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
