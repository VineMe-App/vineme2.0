import { CheckIcon } from "lucide-react";
import { getFirstOpenStep } from "@/lib/dashboard/follow-up-utils";
import type { FollowUp, FollowUpStep } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { stages } from "@/lib/dashboard/terms";

const steps: { id: FollowUpStep; label: string }[] = [
  { id: "reachedOut", label: stages.reachedOut.label },
  { id: "invited", label: stages.spokenTo.label },
  { id: "attended", label: stages.attended.label },
];

/** Three-step progress: done steps are filled, the next step is outlined. */
export function FollowUpStepper({
  person,
  title,
}: {
  person: FollowUp;
  title?: string;
}) {
  const nextStep = getFirstOpenStep(person);

  return (
    <ol className="flex items-start gap-1" title={title}>
      {steps.map((step, index) => {
        const date = person.progress[step.id];
        const isDone = Boolean(date);
        const isNext = step.id === nextStep;
        const showDate = isDone && date !== "earlier";

        return (
          <li key={step.id}>
            <div className="flex w-[4.5rem] shrink-0 flex-col items-center text-center">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[0.65rem] font-medium",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isNext && "border-primary text-primary ring-2 ring-primary/20",
                  !isDone && !isNext && "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {isDone ? <CheckIcon className="size-3" /> : index + 1}
              </span>
              <span
                className={cn(
                  "mt-1 whitespace-nowrap text-xs leading-tight",
                  isDone || isNext
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              <span className="text-[0.65rem] text-muted-foreground leading-tight">
                {showDate ? date : " "}
              </span>
              <span className="sr-only">
                {isDone ? "done" : isNext ? "next step" : "not started"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
