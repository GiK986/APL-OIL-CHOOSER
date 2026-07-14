import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("Common");
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <p className="text-muted-foreground">{t("notFound")}</p>
    </main>
  );
}
