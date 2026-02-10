"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Score, Sport, Region } from "@/types";
import { ScoreActions } from "@/components/admin/ScoreActions";

export type ScoreWithDetails = Score & {
    sport_name: string;
    region_name: string;
    event_name?: string;
};

// We need to pass sports and regions to ScoreActions, but column definitions are static.
// To handle this, we can make `columns` a function that returns the array, or just expect the component to fetch data.
// But DataTable expects a static array usually.
// Best approach: The `cell` renderer receives the row data. We can't easily pass external props to `cell` unless we use table meta or context.
// However, since this is a server component page passing data to client DataTable,
// we can just make the `cell` component (ScoreActions) responsible for its own logic if it had data,
// but it needs `sports` and `regions` lists for the Edit Form.
// 
// Solution: We will pass `sports` and `regions` to the `DataTable` as meta, and access it in `cell`.
// 
// For now, let's redefine `columns` to accept these arrays or use a factory function.
// Actually, easier: The `page.tsx` is server component. `DataTable` is client.
// We can modify `DataTable` to accept `columns` prop.
// So let's make a factory function for columns.

export const getColumns = (
    sports: Sport[],
    regions: Region[],
    onDelete?: (scoreId: string) => void,
    onUpdate?: () => void
): ColumnDef<ScoreWithDetails>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "sport_name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    종목
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "region_name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    시도
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "division",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    종별
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            return <div className="text-center font-medium">{row.getValue("division")}</div>;
        },
    },
    {
        accessorKey: "event_name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    세부종목
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const eventName = row.original.event_name;
            return (
                <div className="text-center">
                    {eventName || <span className="text-muted-foreground">-</span>}
                </div>
            );
        },
    },
    {
        accessorKey: "rank",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    순위
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const rank = row.original.rank;
            if (!rank) return <div className="text-center text-muted-foreground">-</div>;

            const getRankStyle = (r: string) => {
                if (r === "1") return "bg-yellow-100 text-yellow-800 border-yellow-300";
                if (r === "2") return "bg-gray-100 text-gray-800 border-gray-300";
                if (r === "3") return "bg-orange-100 text-orange-800 border-orange-300";
                return "bg-slate-100 text-slate-700";
            };

            return (
                <div className="flex justify-center">
                    <span className={`px-2 py-0.5 rounded-full text-sm font-semibold border ${getRankStyle(rank)}`}>
                        {rank}위
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "expected_score",
        header: "예상 득점",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("expected_score") || "0");
            return <div className="text-center">{amount.toLocaleString()}</div>;
        },
    },
    {
        accessorKey: "actual_score",
        header: "실제 득점",
        cell: ({ row }) => {
            const value = row.getValue("actual_score");
            if (value === undefined || value === null) return <div className="text-center">-</div>;
            const amount = parseFloat(value as string);
            return <div className="font-semibold text-blue-600 text-center">{amount.toLocaleString()}</div>;
        },
    },
    {
        accessorKey: "total_score",
        header: "총 득점",
        cell: ({ row }) => {
            const value = row.getValue("total_score");
            if (value === undefined || value === null) return <div className="text-center">-</div>;
            const amount = parseFloat(value as string);
            return <div className="font-bold text-green-600 text-center">{amount.toLocaleString()}</div>;
        },
    },
    {
        accessorKey: "sub_event_total",
        header: "전국합계",
        cell: ({ row }) => {
            const value = row.original.sub_event_total;
            if (value === undefined || value === null || value === 0) {
                return (
                    <div className="text-center">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                            미입력
                        </span>
                    </div>
                );
            }
            const amount = parseFloat(value as any);
            return <div className="text-center font-medium text-purple-600">{amount.toLocaleString()}</div>;
        },
    },
    {
        accessorKey: "converted_score",
        header: "환산점수",
        cell: ({ row }) => {
            const value = row.original.converted_score;
            if (value === undefined || value === null) {
                return <div className="text-center text-muted-foreground">-</div>;
            }
            const amount = parseFloat(value as any);
            return <div className="text-center font-bold text-indigo-600">{amount.toFixed(2)}</div>;
        },
    },
    {
        id: "medals",
        header: "메달",
        cell: ({ row }) => {
            const gold = row.original.gold || 0;
            const silver = row.original.silver || 0;
            const bronze = row.original.bronze || 0;
            return (
                <div className="text-center text-sm">
                    <span className="text-yellow-600 font-semibold">{gold}</span> /
                    <span className="text-gray-400 font-semibold"> {silver}</span> /
                    <span className="text-orange-600 font-semibold"> {bronze}</span>
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const score = row.original;
            return (
                <ScoreActions
                    score={score}
                    sports={sports}
                    regions={regions}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                />
            );
        },
    },
];
