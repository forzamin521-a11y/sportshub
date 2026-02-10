"use client";

import { useState, useMemo } from "react";
import { SportWithEvents, createColumns } from "./columns";
import { ExpandableDataTable } from "@/components/admin/ExpandableDataTable";
import { SportEventsTable } from "@/components/admin/SportEventsTable";

interface SportsPageClientProps {
    sports: SportWithEvents[];
}

export function SportsPageClient({ sports }: SportsPageClientProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const handleToggleExpand = (id: string) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const columns = useMemo(
        () => createColumns(expandedRows, handleToggleExpand),
        [expandedRows]
    );

    const renderExpandedContent = (sport: SportWithEvents) => {
        return (
            <SportEventsTable
                sportId={sport.id}
                sportName={sport.name}
                events={sport.events || []}
            />
        );
    };

    return (
        <ExpandableDataTable
            columns={columns}
            data={sports}
            filters={{
                columnValue: "name",
                placeholder: "종목명 검색..."
            }}
            expandedRows={expandedRows}
            getRowId={(row) => row.id}
            renderExpandedContent={renderExpandedContent}
        />
    );
}
