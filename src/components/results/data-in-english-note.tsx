import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DataInEnglishNote() {
  const t = useTranslations("Results");
  return (
    <Alert className="mb-4">
      <AlertDescription>{t("dataLanguageNote")}</AlertDescription>
    </Alert>
  );
}
