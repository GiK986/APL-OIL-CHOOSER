import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded" />
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
      {[1, 2, 3].map((i) => (
        <Card key={i} className="mb-4">
          <CardHeader>
            <Skeleton className="h-5 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
