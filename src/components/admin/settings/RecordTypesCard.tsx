"use client";

import { useState, useEffect } from "react";
import { RecordType } from "@/lib/record-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RecordTypesCard() {
    const router = useRouter();
    const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingType, setEditingType] = useState<RecordType | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formId, setFormId] = useState("");
    const [formName, setFormName] = useState("");
    const [formBonusPercentage, setFormBonusPercentage] = useState(0);

    useEffect(() => {
        fetchRecordTypes();
    }, []);

    const fetchRecordTypes = async () => {
        try {
            const res = await fetch("/api/record-types");
            if (res.ok) {
                const data = await res.json();
                setRecordTypes(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch record types:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingType(null);
        setFormId("");
        setFormName("");
        setFormBonusPercentage(0);
        setShowDialog(true);
    };

    const handleEdit = (type: RecordType) => {
        setEditingType(type);
        setFormId(type.id);
        setFormName(type.name);
        setFormBonusPercentage(type.bonus_percentage);
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!formId || !formName) {
            toast.error("ID와 이름을 입력하세요.");
            return;
        }

        setSaving(true);

        try {
            const method = editingType ? "PUT" : "POST";
            const url = editingType ? `/api/record-types/${editingType.id}` : "/api/record-types";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: formId,
                    name: formName,
                    bonus_percentage: formBonusPercentage,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "저장 실패");
            }

            toast.success(editingType ? "수정되었습니다." : "등록되었습니다.");
            setShowDialog(false);
            fetchRecordTypes();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            const res = await fetch(`/api/record-types/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error("삭제 실패");
            }

            toast.success("삭제되었습니다.");
            fetchRecordTypes();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleInitialize = async () => {
        if (!confirm("기본 신기록 타입을 등록하시겠습니까?")) return;

        setSaving(true);
        try {
            const res = await fetch("/api/record-types/init", {
                method: "POST",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "초기화 실패");
            }

            toast.success("기본 신기록 타입이 등록되었습니다.");
            fetchRecordTypes();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "초기화 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold mb-1">신기록 타입 관리</h3>
                    <p className="text-xs text-muted-foreground">
                        신기록 타입과 가산율을 설정합니다. 모든 종목에 공통 적용됩니다.
                    </p>
                </div>
                <Button onClick={handleAdd} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    추가
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">ID</TableHead>
                            <TableHead>이름</TableHead>
                            <TableHead className="w-[150px]">가산율</TableHead>
                            <TableHead className="w-[120px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recordTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <div className="space-y-3">
                                        <p className="text-muted-foreground">등록된 신기록 타입이 없습니다.</p>
                                        <Button onClick={handleInitialize} disabled={saving} className="rounded-xl">
                                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            기본 신기록 타입 등록
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            recordTypes.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-mono text-xs">{type.id}</TableCell>
                                    <TableCell className="font-medium">{type.name}</TableCell>
                                    <TableCell>
                                        <span className="text-orange-600 font-semibold">
                                            {type.bonus_percentage}%
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(type)}
                                            >
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(type.id)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingType ? "신기록 타입 수정" : "신기록 타입 추가"}</DialogTitle>
                        <DialogDescription>
                            신기록 타입의 ID, 이름, 가산율을 입력하세요.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>ID</Label>
                            <Input
                                value={formId}
                                onChange={(e) => setFormId(e.target.value)}
                                placeholder="예: world_new"
                                disabled={!!editingType}
                            />
                            <p className="text-xs text-muted-foreground">
                                영문, 숫자, 언더스코어만 사용 (수정 불가)
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label>이름</Label>
                            <Input
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="예: 세계신기록"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>가산율 (%)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formBonusPercentage}
                                onChange={(e) => setFormBonusPercentage(parseFloat(e.target.value) || 0)}
                                placeholder="예: 300"
                            />
                            <p className="text-xs text-muted-foreground">
                                300% = 실제득점의 300%를 추가로 가산 (총 400%)
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            취소
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editingType ? "수정" : "추가"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
