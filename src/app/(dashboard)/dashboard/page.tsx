import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Ringkasan</h1><p className="text-muted-foreground">Ikhtisar operasional photobooth Anda.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["Pendapatan Hari Ini", "Pendapatan Bulan Ini", "Total Sesi Bulan Ini", "Mesin Online"].map((title) => <Card key={title}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><Skeleton className="h-8 w-28" /><p className="mt-2 text-xs text-muted-foreground">Data akan tampil setelah terhubung.</p></CardContent></Card>)}
      </div>
    </div>
  );
}
