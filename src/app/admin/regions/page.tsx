import { DataTable } from "@/components/admin/DataTable";
import { columns } from "./columns";
import { getSheetData } from "@/lib/google-sheets";
import { SHEET_NAMES } from "@/lib/constants";
import { CreateRegionDialog } from "@/components/admin/CreateRegionDialog";
import { Region } from "@/types";

export const dynamic = 'force-dynamic';

async function getData(): Promise<Region[]> {
    const regionsData = await getSheetData(SHEET_NAMES.REGIONS);

    const regions: Region[] = regionsData.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        is_host: String(row.is_host).toLowerCase() === 'true',
        color: String(row.color),
    }));

    return regions;
}

export default async function AdminRegionsPage() {
    const regions = await getData();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">시도 관리</h2>
                <CreateRegionDialog />
            </div>

            <DataTable
                columns={columns}
                data={regions}
                filters={{
                    columnValue: "name",
                    placeholder: "시도명 검색..."
                }}
            />
        </div>
    );
}
