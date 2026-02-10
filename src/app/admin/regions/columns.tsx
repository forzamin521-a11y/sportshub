"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Region } from "@/types";
import { RegionActions } from "@/components/admin/RegionActions";

export const columns: ColumnDef<Region>[] = [
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
                    시도 코드
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            return <div className="font-mono font-semibold">{row.getValue("id")}</div>;
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
                    시도명
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            return <div className="font-medium">{row.getValue("name")}</div>;
        },
    },
    {
        accessorKey: "is_host",
        header: "개최지 여부",
        cell: ({ row }) => {
            const isHost = row.getValue("is_host") as boolean;
            return (
                <div className="text-center">
                    {isHost ? (
                        <Badge variant="default">개최지</Badge>
                    ) : (
                        <Badge variant="outline">참가</Badge>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "color",
        header: "색상",
        cell: ({ row }) => {
            const color = row.getValue("color") as string;
            return (
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-sm">{color}</span>
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const region = row.original;
            return <RegionActions region={region} />;
        },
    },
];
