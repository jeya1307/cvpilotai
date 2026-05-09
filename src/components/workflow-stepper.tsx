import { Check, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface WorkflowStep {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: StepStatus;
}

export function WorkflowStepper({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        return (
          <li
            key={step.key}
            className={cn(
              "flex items-start gap-4 rounded-xl border p-4 transition-all",
              step.status === "active" &&
                "border-brand bg-brand/5 shadow-[var(--shadow-card)]",
              step.status === "done" && "border-success/40 bg-success/5",
              step.status === "error" && "border-danger/50 bg-danger/5",
              step.status === "pending" && "border-border bg-card opacity-60",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                step.status === "active" && "bg-brand text-primary-foreground",
                step.status === "done" && "bg-success text-primary-foreground",
                step.status === "error" && "bg-danger text-primary-foreground",
                step.status === "pending" && "bg-muted text-muted-foreground",
              )}
            >
              {step.status === "active" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : step.status === "done" ? (
                <Check className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">
                  {idx + 1}. {step.title}
                </p>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {step.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
