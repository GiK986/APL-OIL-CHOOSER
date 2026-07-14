import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";
import { VehicleHeaderCard } from "@/components/results/vehicle-header-card";
import { ComponentCard } from "@/components/results/component-card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ locale: string; typeId: string }>;
}) {
  const { locale, typeId: typeIdParam } = await params;
  setRequestLocale(locale);

  const typeId = Number(typeIdParam);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    notFound();
  }

  let recommendation;
  try {
    recommendation = await olyslager.getRecommendations(typeId);
  } catch (err) {
    if (err instanceof OlyslagerApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const t = await getTranslations("Results");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <VehicleHeaderCard vehicle={recommendation} />
      {recommendation.components.length === 0 ? (
        <Alert>
          <AlertDescription>{t("noComponents")}</AlertDescription>
        </Alert>
      ) : (
        recommendation.components.map((component) => (
          <ComponentCard key={component.id} component={component} />
        ))
      )}
    </main>
  );
}
