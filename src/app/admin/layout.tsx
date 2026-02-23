import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/api/auth/signin?callbackUrl=/admin");
    }

    return (
        <div className="flex min-h-[calc(100vh-3.5rem)]">
            <AdminSidebar />
            <main className="flex-1 p-6 overflow-auto">
                {children}
            </main>
        </div>
    );
}
