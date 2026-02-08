import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProductDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-muted animate-pulse rounded" />
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-56 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    </div>
  );
}
