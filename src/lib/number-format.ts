const oneDecimalFormatter = new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
});

export function formatOneDecimal(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "-";
    return oneDecimalFormatter.format(value);
}

export function formatMedalCount(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "-";
    return integerFormatter.format(Math.round(value));
}
