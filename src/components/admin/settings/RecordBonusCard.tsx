"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_RECORD_TYPES, RecordType } from "@/lib/record-types";

interface RecordBonusCardProps {
    sports: any[];
    initialConfigs: any[];
}

export function RecordBonusCard({ sports, initialConfigs }: RecordBonusCardProps) {
    const [recordTypes, setRecordTypes] = useState<RecordType[]>(DEFAULT_RECORD_TYPES);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(0);
    const [saving, setSaving] = useState(false);

    const handleEdit = (record: RecordType) => {
        setEditingId(record.id);
        setEditValue(record.bonus_percentage);
    };

    const handleSave = () => {
        if (editingId) {
            setRecordTypes(prevTypes =>
                prevTypes.map(type =>
                    type.id === editingId
                        ? { ...type, bonus_percentage: editValue }
                        : type
                )
            );
            toast.success("변경사항이 저장되었습니다.");
            setEditingId(null);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue(0);
    };

    return (
        <div className="glass-card p-6">
            <div className="mb-5">
                <h3 className="font-semibold text-lg">신기록 가산 배율 설정</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    신기록 달성 시 적용되는 가산 배율을 설정합니다. 모든 종목에 동일하게 적용됩니다.
                </p>
                <div className="mt-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700">
                        <strong>중요:</strong> 50% = 실제득점의 50%를 추가 (총 150%)
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                        예: 실제득점 10점 + 50% 가산 = 10점 + 5점 = 15점 (확정자가산 5점)
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-border/40 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-accent/30 hover:bg-accent/30">
                            <TableHead className="font-semibold">신기록 타입</TableHead>
                            <TableHead className="font-semibold">가산 배율</TableHead>
                            <TableHead className="font-semibold text-right">액션</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recordTypes.map((record) => {
                            const isEditing = editingId === record.id;

                            return (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">
                                        {record.name}
                                        {record.id === "none" && (
                                            <span className="ml-2 text-xs text-muted-foreground">(기본값)</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    step="10"
                                                    min="0"
                                                    max="2000"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(Number(e.target.value))}
                                                    className="w-32"
                                                />
                                                <span className="text-sm">% 가산</span>
                                            </div>
                                        ) : (
                                            <span className="text-lg font-bold text-orange-600">
                                                {record.bonus_percentage > 0 ? `${record.bonus_percentage}% 가산` : '해당없음'}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {record.id !== "none" && (
                                            <div className="flex justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={handleSave}
                                                            disabled={saving}
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            <Save className="mr-1 h-3.5 w-3.5" />
                                                            저장
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={handleCancel}
                                                        >
                                                            <X className="mr-1 h-3.5 w-3.5" />
                                                            취소
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(record)}
                                                    >
                                                        <Pencil className="mr-1 h-3.5 w-3.5" />
                                                        수정
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
