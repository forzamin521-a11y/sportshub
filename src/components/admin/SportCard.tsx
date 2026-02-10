"use client";

import { useState } from "react";
import { Sport, SportEvent } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Target, MoreVertical, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EditSportDialog } from "./EditSportDialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SportCardProps {
    sport: Sport;
    eventCount: number;
    divisionCount: number;
}

export function SportCard({ sport, eventCount, divisionCount }: SportCardProps) {
    const router = useRouter();
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/sports/${sport.id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "삭제 실패");
            }

            toast.success("종목이 삭제되었습니다.");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
        } finally {
            setDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    return (
        <>
            <Card className="glass-card hover:shadow-lg transition-all duration-300 group relative">
                <Link href={`/admin/sports/${sport.id}`} className="block">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                                    {sport.name}
                                </CardTitle>
                                {sport.sub_name && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {sport.sub_name}
                                    </p>
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowEditDialog(true);
                                        }}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        수정
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowDeleteDialog(true);
                                        }}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        삭제
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col items-center p-2 rounded-lg bg-primary/5 border border-primary/10">
                                <Target className="h-4 w-4 text-primary mb-1" />
                                <span className="text-xs text-muted-foreground">확정점수</span>
                                <span className="text-sm font-bold mt-0.5">
                                    {sport.max_score?.toLocaleString() || 0}
                                </span>
                            </div>
                            <div className="flex flex-col items-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                <Users className="h-4 w-4 text-blue-600 mb-1" />
                                <span className="text-xs text-muted-foreground">종별</span>
                                <span className="text-sm font-bold mt-0.5">{divisionCount}개</span>
                            </div>
                            <div className="flex flex-col items-center p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                <Trophy className="h-4 w-4 text-purple-600 mb-1" />
                                <span className="text-xs text-muted-foreground">세부종목</span>
                                <span className="text-sm font-bold mt-0.5">{eventCount}개</span>
                            </div>
                        </div>
                    </CardContent>
                </Link>
            </Card>

            {/* Edit Dialog */}
            <EditSportDialog
                sport={sport}
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>종목 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-semibold text-foreground">{sport.name}</span>을(를) 삭제하시겠습니까?
                            <br />
                            <span className="text-destructive font-medium">
                                이 작업은 되돌릴 수 없으며, 관련된 세부종목과 점수 데이터도 함께 삭제됩니다.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {deleting ? "삭제 중..." : "삭제"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
