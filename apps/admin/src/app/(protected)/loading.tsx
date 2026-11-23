import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ProtectedLoading() {
  const t = await getTranslations("Loading");

  return (
    <div aria-label={t("dashboard")} className="space-y-5" role="status">
      <div className="mb-6 hidden lg:block">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Card className="p-5" key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-5 h-7 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
      <span className="sr-only">{t("dashboard")}</span>
    </div>
  );
}
