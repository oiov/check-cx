import {cn} from "@/lib/utils";

interface SkeletonBlockProps {
  className?: string;
}

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={cn("rounded-md bg-muted/60", className)} />;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-5 w-12 rounded-full" />
      </div>
      <SkeletonBlock className="h-6 w-24" />
      <SkeletonBlock className="h-3 w-40" />
      <SkeletonBlock className="h-16 w-full" />
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
    </div>
  );
}

function ProviderCardSkeleton() {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <SkeletonBlock className="h-4 w-28 sm:h-5 sm:w-32" />
                <SkeletonBlock className="h-5 w-12 rounded-lg sm:h-6 sm:w-14" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonBlock className="h-4 w-16 rounded-md" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/40 p-3">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="mt-2 h-5 w-20" />
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="mt-2 h-5 w-20" />
          </div>
        </div>

        <div className="space-y-3 border-t border-border/30 pt-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

function GroupPanelSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <section className="border-b pb-6 last:border-b-0">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <SkeletonBlock className="h-4 w-2 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <SkeletonBlock className="h-5 w-32 sm:h-6 sm:w-40" />
              <SkeletonBlock className="h-5 w-16 rounded-full" />
              <SkeletonBlock className="h-5 w-10 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-3 w-14" />
              <SkeletonBlock className="h-3 w-12" />
            </div>
          </div>
        </div>
        <SkeletonBlock className="h-7 w-16 shrink-0 rounded-lg" />
      </div>

      <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cardCount }).map((_, index) => (
          <ProviderCardSkeleton key={`provider-card-skeleton-${index}`} />
        ))}
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="relative animate-pulse">
      <header className="mb-6 space-y-4 sm:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
            <SkeletonBlock className="h-6 w-24" />
            <SkeletonBlock className="hidden h-4 w-32 sm:block" />
            <SkeletonBlock className="ml-auto h-6 w-20 shrink-0 rounded-full sm:ml-0" />
            <SkeletonBlock className="h-4 w-4 rounded" />
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
          </div>

          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:w-auto">
            <SkeletonBlock className="h-6 w-28 shrink-0 rounded-full" />
            <SkeletonBlock className="h-4 min-w-0 flex-1 sm:w-44 sm:flex-none" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
          <SkeletonBlock className="h-8 w-full rounded-md sm:w-56" />
          <div className="flex items-center gap-1.5">
            <SkeletonBlock className="h-5 w-12 rounded-full" />
            <SkeletonBlock className="h-5 w-12 rounded-full" />
            <SkeletonBlock className="h-5 w-12 rounded-full" />
          </div>
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <SkeletonBlock className="h-8 flex-1 rounded-md sm:w-28 sm:flex-none" />
            <SkeletonBlock className="h-8 flex-1 rounded-md sm:w-28 sm:flex-none" />
          </div>
        </div>
      </header>

      <main className="relative z-10 min-h-[50vh]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <GroupPanelSkeleton key={`group-panel-skeleton-${index}`} cardCount={3} />
          ))}
        </div>
      </main>
    </div>
  );
}

export function GroupDashboardSkeleton() {
  return (
    <div className="relative animate-pulse">
      <header className="mb-6 space-y-3 sm:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <SkeletonBlock className="h-6 w-48 sm:h-7 sm:w-60" />
              <SkeletonBlock className="h-5 w-14 rounded-full" />
              <SkeletonBlock className="h-4 w-4 rounded" />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:w-auto">
            <SkeletonBlock className="h-8 flex-1 rounded-md sm:w-28 sm:flex-none" />
            <SkeletonBlock className="h-4 w-full sm:w-44" />
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={`group-skeleton-${index}`} />
        ))}
      </section>
    </div>
  );
}
