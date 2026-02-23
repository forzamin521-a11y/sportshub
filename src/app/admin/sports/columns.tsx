"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sport, SportEvent } from "@/types";
import { SportActions } from "@/components/admin/SportActions";

const getCategoryColor = (category: string) => {
    switch (category) {
        case "구기":
            return "bg-blue-100 text-blue-800 border-blue-300";
        case "무도":
            return "bg-red-100 text-red-800 border-red-300";
        case "기타":
            return "bg-gray-100 text-gray-800 border-gray-300";
        default:
            return "bg-gray-100 text-gray-800 border-gray-300";
    }
};

// Extended Sport type with event counts
export interface SportWithEvents extends Sport {
    divisionCount?: number;
    eventCount?: number;
    events?: SportEvent[];
}

export const createColumns = (
    expandedRows: Set<string>,
    onToggleExpand: (id: string) => void
): ColumnDef<SportWithEvents>[] => [
    {
        id: "expand",
        header: () => null,
        cell: ({ row }) => {
            const sport = row.original;
            const hasEvents = (sport.eventCount || 0) > 0;
            const isExpanded = expandedRows.has(sport.id);

            return (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onToggleExpand(sport.id)}
                    disabled={!hasEvents}
                >
                    {hasEvents ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : null}
                </Button>
            );
        },
        enableSorting: false,
        enableHiding: false,
    },
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
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    종목명
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            return <div className="font-semibold">{row.getValue("name")}</div>;
        },
    },
    {
        id: "divisionCount",
        header: "종별수",
        cell: ({ row }) => {
            const count = row.original.divisionCount || 0;
            return (
                <div className="text-center">
                    {count > 0 ? (
                        <Badge variant="secondary">{count}</Badge>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                </div>
            );
        },
    },
    {
        id: "eventCount",
        header: "세부종목수",
        cell: ({ row }) => {
            const count = row.original.eventCount || 0;
            return (
                <div className="text-center">
                    {count > 0 ? (
                        <Badge variant="outline">{count}</Badge>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "max_score",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    확정점수
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const score = row.getValue("max_score") as number;
            return <div className="font-medium text-center">{score.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>;
        },
    },
    {
        accessorKey: "category",
        header: "카테고리",
        cell: ({ row }) => {
            const category = row.getValue("category") as string;
            return (
                <div className="text-center">
                    <Badge variant="outline" className={getCategoryColor(category)}>
                        {category}
                    </Badge>
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const sport = row.original;
            return <SportActions sport={sport} />;
        },
    },
];

// Default columns for backward compatibility
export const columns: ColumnDef<Sport>[] = [
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
        accessorKey: "id",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    종목 ID
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            return <div className="font-mono text-sm">{row.getValue("id")}</div>;
        },
    },
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    종목명
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            return <div className="font-semibold">{row.getValue("name")}</div>;
        },
    },
    {
        accessorKey: "sub_name",
        header: "세부종목",
        cell: ({ row }) => {
            const subName = row.getValue("sub_name") as string | undefined;
            return <div className="text-sm text-muted-foreground">{subName || "-"}</div>;
        },
    },
    {
        accessorKey: "max_score",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    확정점수
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const score = row.getValue("max_score") as number;
            return <div className="font-medium text-center">{score.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>;
        },
    },
    {
        accessorKey: "category",
        header: "카테고리",
        cell: ({ row }) => {
            const category = row.getValue("category") as string;
            return (
                <div className="text-center">
                    <Badge variant="outline" className={getCategoryColor(category)}>
                        {category}
                    </Badge>
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const sport = row.original;
            return <SportActions sport={sport} />;
        },
    },
];
