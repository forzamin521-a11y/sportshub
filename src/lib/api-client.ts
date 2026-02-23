"use client";

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

async function parseErrorMessage(res: Response): Promise<string> {
    try {
        const data = await res.json();
        if (data?.error) return String(data.error);
    } catch {
        // no-op
    }
    return `요청 실패 (${res.status})`;
}

export async function requestJson<T>(
    url: string,
    init?: RequestInit
): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) {
        const message = await parseErrorMessage(res);
        throw new ApiError(message, res.status);
    }
    return (await res.json()) as T;
}

export function toUserErrorMessage(
    error: unknown,
    fallback: string
): string {
    if (error instanceof ApiError) {
        if (error.status === 429) {
            return "Google Sheets API 한도 초과. 1분 후 다시 시도해주세요.";
        }
        return error.message || fallback;
    }

    if (error instanceof Error) {
        return error.message || fallback;
    }

    return fallback;
}
