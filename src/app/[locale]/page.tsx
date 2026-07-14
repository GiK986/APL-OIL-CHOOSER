import { getTranslations, setRequestLocale } from "next-intl/server";
import { VehicleSelector } from "@/components/vehicle-selector/vehicle-selector";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t("headline")}</h1>
        <p className="mt-3 text-muted-foreground">{t("subcopy")}</p>
      </div>
      <div className="mt-10 w-full max-w-5xl">
        <VehicleSelector />
      </div>
    </main>
  );
}
