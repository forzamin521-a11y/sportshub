"use client";

import { useState } from "react";
import { Sport } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ScoreConfigCardProps {
    sports: Sport[];
}

export function ScoreConfigCard({ sports: initialSports }: ScoreConfigCardProps) {
    const [sports, setSports] = useState<Sport[]>(initialSports);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [changes, setChanges] = useState<Map<string, number>>(new Map());
    const router = useRouter();

    const handleEdit = (sport: Sport) => {
        setEditingId(sport.id);
        setEditValue(changes.get(sport.id) ?? sport.max_score);
    };

    const handleSave = (sportId: string) => {
        const newChanges = new Map(changes);
        newChanges.set(sportId, editValue);
        setChanges(newChanges);
        setEditingId(null);
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    const handleSaveAll = async () => {
        if (changes.size === 0) {
            toast.info("변경사항이 없습니다.");
            return;
        }

        setSaving(true);

        try {
            for (const [sportId, newScore] of changes) {
                const res = await fetch(`/api/sports/${sportId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ max_score: newScore }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    console.error("Failed to update:", errorData);
                    throw new Error(`Failed to update ${sportId}`);
                }
            }

            toast.success("모든 변경사항이 저장되었습니다.");
            setChanges(new Map());
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const getCurrentValue = (sport: Sport) => {
        return changes.get(sport.id) ?? sport.max_score ?? 0;
    };

    const hasChanges = changes.size > 0;

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="font-semibold">종목별 확정점수</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        각 종목의 확정점수(최대 배점)를 수정합니다.
                    </p>
                </div>
                {hasChanges && (
                    <Button onClick={handleSaveAll} disabled={saving} className="rounded-xl text-xs">
                        {saving ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            <>
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                변경사항 저장 ({changes.size})
                            </>
                        )}
                    </Button>
                )}
            </div>
            {sports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    등록된 종목이 없습니다.
                </div>
            ) : (
                <div className="rounded-xl border border-border/40 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-accent/30 hover:bg-accent/30">
                                <TableHead className="text-xs font-semibold">종목</TableHead>
                                <TableHead className="text-right text-xs font-semibold">확정점수</TableHead>
                                <TableHead className="w-[80px] text-xs font-semibold">액션</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sports.map((sport) => (
                                <TableRow key={sport.id} className="hover:bg-accent/20 transition-colors">
                                    <TableCell className="font-medium text-sm">
                                        {sport.name}
                                        {sport.sub_name && (
                                            <span className="text-muted-foreground ml-1">
                                                ({sport.sub_name})
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                        {editingId === sport.id ? (
                                            <Input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(Number(e.target.value))}
                                                className="w-32 ml-auto rounded-lg"
                                                autoFocus
                                            />
                                        ) : (
                                            <span className={changes.has(sport.id) ? "text-blue-600 font-medium" : ""}>
                                                {getCurrentValue(sport).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                {changes.has(sport.id) && (
                                                    <span className="text-muted-foreground ml-1 text-xs">
                                                        (수정됨)
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === sport.id ? (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleSave(sport.id)}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(sport)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
