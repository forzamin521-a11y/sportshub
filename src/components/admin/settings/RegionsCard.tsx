"use client";

import { useState, useEffect } from "react";
import { Region } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { mutateJson, requestJson, toUserErrorMessage } from "@/lib/api-client";

export function RegionsCard() {
    const router = useRouter();
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingRegion, setEditingRegion] = useState<Region | null>(null);
    const [deletingRegion, setDeletingRegion] = useState<Region | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formId, setFormId] = useState("");
    const [formName, setFormName] = useState("");
    const [formIsHost, setFormIsHost] = useState(false);
    const [formColor, setFormColor] = useState("#3b82f6");

    useEffect(() => {
        fetchRegions();
    }, []);

    const fetchRegions = async () => {
        try {
            const data = await requestJson<{ data: Region[] }>("/api/regions");
            setRegions(data.data || []);
        } catch (error) {
            console.error("Failed to fetch regions:", error);
            toast.error(toUserErrorMessage(error, "시/도 목록을 불러오지 못했습니다."));
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingRegion(null);
        setFormId("");
        setFormName("");
        setFormIsHost(false);
        setFormColor("#3b82f6");
        setShowDialog(true);
    };

    const handleEdit = (region: Region) => {
        setEditingRegion(region);
        setFormId(region.id);
        setFormName(region.name);
        setFormIsHost(region.is_host);
        setFormColor(region.color || "#3b82f6");
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!formId || !formName) {
            toast.error("ID와 이름을 입력하세요.");
            return;
        }

        setSaving(true);

        try {
            const method = editingRegion ? "PUT" : "POST";
            const url = editingRegion ? `/api/regions/${editingRegion.id}` : "/api/regions";

            await mutateJson(url, {
                method,
                body: {
                    id: formId,
                    name: formName,
                    is_host: formIsHost,
                    color: formColor,
                },
            });

            toast.success(editingRegion ? "수정되었습니다." : "등록되었습니다.");
            setShowDialog(false);
            fetchRegions();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(toUserErrorMessage(error, "오류가 발생했습니다."));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingRegion) return;
        try {
            await mutateJson(`/api/regions/${deletingRegion.id}`, {
                method: "DELETE",
            });

            toast.success("삭제되었습니다.");
            setDeletingRegion(null);
            fetchRegions();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(toUserErrorMessage(error, "삭제 중 오류가 발생했습니다."));
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
                    <h3 className="font-semibold mb-1">시/도 관리</h3>
                    <p className="text-xs text-muted-foreground">
                        참가 시/도를 등록하고 관리합니다. 점수 데이터는 시/도별로 구분됩니다.
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
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>시/도명</TableHead>
                            <TableHead className="w-[100px]">색상</TableHead>
                            <TableHead className="w-[120px]">호스트</TableHead>
                            <TableHead className="w-[120px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {regions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    등록된 시/도가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            regions.map((region) => (
                                <TableRow key={region.id}>
                                    <TableCell className="font-mono text-xs">{region.id}</TableCell>
                                    <TableCell className="font-medium">{region.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded border"
                                                style={{ backgroundColor: region.color }}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                {region.color}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {region.is_host && (
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                호스트
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(region)}
                                            >
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDeletingRegion(region)}
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
                        <DialogTitle>{editingRegion ? "시/도 수정" : "시/도 추가"}</DialogTitle>
                        <DialogDescription>
                            시/도 정보를 입력하세요.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>ID (시도 코드)</Label>
                            <Input
                                value={formId}
                                onChange={(e) => setFormId(e.target.value.toUpperCase())}
                                placeholder="예: GG, SE, BS"
                                disabled={!!editingRegion}
                                maxLength={3}
                            />
                            <p className="text-xs text-muted-foreground">
                                2-3자 영문 대문자 (수정 불가)
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label>시/도명</Label>
                            <Input
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="예: 경기도"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>색상</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={formColor}
                                    onChange={(e) => setFormColor(e.target.value)}
                                    className="w-20 h-10"
                                />
                                <Input
                                    value={formColor}
                                    onChange={(e) => setFormColor(e.target.value)}
                                    placeholder="#3b82f6"
                                    className="flex-1"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                차트 및 그래프에서 사용될 색상
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_host"
                                checked={formIsHost}
                                onCheckedChange={(checked) => setFormIsHost(checked === true)}
                            />
                            <Label htmlFor="is_host" className="cursor-pointer">
                                호스트 시/도로 설정
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            취소
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editingRegion ? "수정" : "추가"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingRegion} onOpenChange={(open) => !open && setDeletingRegion(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>시/도를 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deletingRegion?.name} 삭제 시 연결된 점수 데이터에 영향이 있을 수 있습니다. 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            삭제
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
