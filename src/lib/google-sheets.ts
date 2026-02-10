import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

export interface SheetRow {
    [key: string]: string | number | boolean;
}

export async function getSheetData(
    sheetName: string,
    range?: string
): Promise<SheetRow[]> {
    const fullRange = range ? `${sheetName}!${range}` : sheetName;

    if (!SPREADSHEET_ID) {
        console.warn("GOOGLE_SPREADSHEET_ID is missing. Running in mock mode.");
        return []; // Return mock data or empty array if not configured
    }

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: fullRange,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        const headers = rows[0] as string[];
        // Ensure all rows have enough columns corresponding to headers
        return rows.slice(1).map((row) => {
            const obj: SheetRow = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] ?? '';
            });
            return obj;
        });

    } catch (error: any) {
        console.error(`Error reading sheet ${sheetName}:`, error);

        // API 한도 에러 체크
        if (error?.code === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
            throw new Error('Google Sheets API 한도 초과: 잠시 후 다시 시도해주세요.');
        }

        throw error;
    }
}

export async function appendSheetData(
    sheetName: string,
    values: (string | number | boolean)[][]
) {
    if (!SPREADSHEET_ID) {
        console.warn("GOOGLE_SPREADSHEET_ID is missing. Cannot write data.");
        return;
    }

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            },
        });
    } catch (error: any) {
        console.error(`Error appending to sheet ${sheetName}:`, error);

        // API 한도 에러 체크
        if (error?.code === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
            throw new Error('Google Sheets API 한도 초과: 잠시 후 다시 시도해주세요.');
        }

        throw error;
    }
}

export async function updateSheetData(
    sheetName: string,
    range: string,
    values: (string | number | boolean)[][]
) {
    if (!SPREADSHEET_ID) return;

    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!${range}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values,
            }
        });
    } catch (error: any) {
        console.error(`Error updating sheet ${sheetName}:`, error);

        // API 한도 에러 체크
        if (error?.code === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
            throw new Error('Google Sheets API 한도 초과: 잠시 후 다시 시도해주세요.');
        }

        throw error;
    }
}

export async function batchUpdateSheetData(
    sheetName: string,
    rangeValuePairs: { range: string; values: (string | number | boolean)[][] }[]
) {
    if (!SPREADSHEET_ID) return;
    if (rangeValuePairs.length === 0) return;

    try {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: rangeValuePairs.map(pair => ({
                    range: `${sheetName}!${pair.range}`,
                    values: pair.values,
                })),
            },
        });
    } catch (error: any) {
        console.error(`Error batch updating sheet ${sheetName}:`, error);

        if (error?.code === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
            throw new Error('Google Sheets API 한도 초과: 잠시 후 다시 시도해주세요.');
        }

        throw error;
    }
}

export async function deleteSheetRow(
    sheetName: string,
    rowIndex: number
) {
    if (!SPREADSHEET_ID) return;

    try {
        // Google Sheets API는 0-based index를 사용하지만,
        // 헤더가 0번 행이므로 실제 데이터는 1번 행부터 시작
        // rowIndex는 데이터 배열의 인덱스이므로 +2 (헤더 +1, 0-based to 1-based +1)
        const actualRowIndex = rowIndex + 2;

        // Get sheet ID
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const sheet = spreadsheet.data.sheets?.find(
            s => s.properties?.title === sheetName
        );

        if (!sheet || !sheet.properties?.sheetId) {
            throw new Error(`Sheet ${sheetName} not found`);
        }

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: actualRowIndex - 1,
                                endIndex: actualRowIndex,
                            },
                        },
                    },
                ],
            },
        });
    } catch (error: any) {
        console.error(`Error deleting row from sheet ${sheetName}:`, error);

        // API 한도 에러 체크
        if (error?.code === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
            throw new Error('Google Sheets API 한도 초과: 잠시 후 다시 시도해주세요.');
        }

        throw error;
    }
}
