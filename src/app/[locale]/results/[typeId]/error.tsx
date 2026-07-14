"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ResultsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("Common");
  const tr = useTranslations("Results");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
      <Alert variant="destructive">
        <AlertDescription>{t("error")}</AlertDescription>
      </Alert>
      <div className="flex gap-3">
        <Button onClick={() => unstable_retry()}>{t("retry")}</Button>
        <Button variant="outline" render={<Link href="/">{tr("backToPicker")}</Link>} />

      </div>
    </main>
  );
}
