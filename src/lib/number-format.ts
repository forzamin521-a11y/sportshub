const oneDecimalFormatter = new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

export function formatOneDecimal(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "-";
    return oneDecimalFormatter.format(value);
}

