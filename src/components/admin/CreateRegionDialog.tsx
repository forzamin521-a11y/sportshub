"use client";

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
import { RegionForm } from "@/components/admin/forms/RegionForm";

export function CreateRegionDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    새 시도 등록
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>시도 등록</DialogTitle>
                    <DialogDescription>
                        새로운 시도(Region) 정보를 입력하세요.
                    </DialogDescription>
                </DialogHeader>
                <RegionForm
                    onSuccess={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
