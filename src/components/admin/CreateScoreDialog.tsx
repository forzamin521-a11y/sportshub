"use client";

import { Score, Sport, Region } from "@/types";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScoreForm } from "@/components/admin/forms/ScoreForm";

interface Props {
    sports: Sport[];
    regions: Region[];
    onSuccess?: () => void;
}

export function CreateScoreDialog({ sports, regions, onSuccess }: Props) {
    const [open, setOpen] = useState(false);

    const handleSuccess = () => {
        setOpen(false);
        if (onSuccess) {
            onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    새 데이터 등록
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>점수 데이터 등록</DialogTitle>
                    <DialogDescription>
                        새로운 점수 데이터를 입력하세요.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    <ScoreForm
                        sports={sports}
                        regions={regions}
                        onSuccess={handleSuccess}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
