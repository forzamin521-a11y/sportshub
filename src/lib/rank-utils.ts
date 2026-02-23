const ROUND_LABELS: Record<string, string> = {
    round_of_4: "4강",
    round_of_8: "8강",
    round_of_16: "16강",
};

export function formatRankLabel(rank: string): string {
    if (rank.startsWith("tie_")) {
        const num = Number(rank.replace("tie_", ""));
        return Number.isFinite(num) ? `공동${num}위` : rank;
    }

    if (ROUND_LABELS[rank]) {
        return ROUND_LABELS[rank];
    }

    const num = Number(rank);
    if (Number.isFinite(num)) {
        return `${num}위`;
    }

    return rank;
}

export function rankSortValue(rank: string): number {
    if (rank.startsWith("tie_")) {
        const num = Number(rank.replace("tie_", ""));
        if (Number.isFinite(num)) return num + 0.1;
    }

    if (rank.startsWith("round_of_")) {
        const num = Number(rank.replace("round_of_", ""));
        if (Number.isFinite(num)) return 10_000 + num;
    }

    const num = Number(rank);
    if (Number.isFinite(num)) return num;

    return 99_999;
}
