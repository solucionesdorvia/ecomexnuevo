import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

export function AnalysisModule({
  title,
  subtitle,
  icon,
  done = false,
  loading = false,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  done?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("analysis-module", loading && "is-loading", className)}>
      <header className="analysis-module-head">
        <div className="analysis-module-title-wrap">
          <span className="analysis-module-icon">
            <Icon name={icon} size={16} className="text-current" />
          </span>
          <div>
            <h3 className="analysis-module-title">{title}</h3>
            {subtitle ? <p className="analysis-module-subtitle">{subtitle}</p> : null}
          </div>
        </div>
        <span className={cn("analysis-status", done && "is-done", loading && "is-loading")}>
          {loading ? "ANALYZING" : done ? "READY" : "WAITING"}
        </span>
      </header>
      <div className="analysis-module-body">{children}</div>
    </section>
  );
}

