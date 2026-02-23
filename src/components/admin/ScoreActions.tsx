"use client";

import { Score, Sport, Region } from "@/types";
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import { ScoreForm } from "@/components/admin/forms/ScoreForm";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ScoreActionsProps {
    score: Score;
    sports: Sport[];
    regions: Region[];
    onDelete?: (scoreId: string) => void;
    onUpdate?: () => void;
}

export function ScoreActions({ score, sports, regions, onDelete: onDeleteCallback, onUpdate }: ScoreActionsProps) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/scores/${score.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("삭제되었습니다.");
            setShowDeleteAlert(false);

            // Call the parent callback to update UI immediately
            if (onDeleteCallback) {
                onDeleteCallback(score.id);
            } else {
                // Fallback to refresh if no callback provided
                router.refresh();
            }
        } catch (error) {
            toast.error("삭제에 실패했습니다.");
            setDeleting(false);
        }
    }

    function handleEditSuccess() {
        setShowEditDialog(false);
        if (onUpdate) {
            onUpdate();
        } else {
            router.refresh();
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(score.id)}
                    >
                        ID 복사
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowEditDialog(true); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); setShowDeleteAlert(true); }}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        삭제
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-4">
                        <DialogTitle>점수 수정</DialogTitle>
                        <DialogDescription>
                            점수 데이터를 수정합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        <ScoreForm
                            initialData={score}
                            sports={sports}
                            regions={regions}
                            onSuccess={handleEditSuccess}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            이 작업은 되돌릴 수 없습니다. 해당 점수 데이터가 영구적으로 삭제됩니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    삭제 중...
                                </>
                            ) : (
                                "삭제"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
