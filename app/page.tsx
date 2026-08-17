import {DashboardBootstrap} from "@/components/dashboard-bootstrap";
import {ClientYear} from "@/components/client-time";
import packageJson from "@/package.json";

const ESTIMATED_VERSION = `v${packageJson.version}`;

export default function Home() {
  return (
    <div className="py-8 md:py-16">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:gap-8 sm:px-6">
        <DashboardBootstrap />
      </main>
      
      <footer className="mt-16 border-t border-border/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <div className="text-sm text-muted-foreground">
            © <ClientYear placeholder="2026" /> Check CX. All rights reserved.
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition hover:border-border/80 hover:text-foreground">
              <span className="font-medium opacity-70">Ver.</span>
              <span className="font-mono">{ESTIMATED_VERSION}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
