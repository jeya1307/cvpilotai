import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Briefcase,
  FileText,
  Send,
  Sparkles,
  Target,
  Upload,
  Zap,
  CheckCircle2,
  AlertCircle,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import {
  WorkflowStepper,
  type WorkflowStep,
} from "@/components/workflow-stepper";
import { extractPdfText } from "@/lib/pdf-extract";
import { processApplication } from "@/lib/apply.functions";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "AutoApply — Automated Job Application Workflow" },
      {
        name: "description",
        content:
          "Upload your resume, paste a job description, and let AI parse, match, and draft a tailored application automatically.",
      },
    ],
  }),
});

interface ApplyResult {
  jobTitle: string;
  company: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  tailoredSummary: string;
  coverLetter: string;
  recommendation: "apply" | "review" | "skip";
  recommendationReason: string;
}

const initialSteps: WorkflowStep[] = [
  {
    key: "parse",
    title: "Parse resume",
    description: "Extract text and skills from your uploaded PDF.",
    icon: FileText,
    status: "pending",
  },
  {
    key: "analyze",
    title: "Analyze job description",
    description: "Identify role, company and key requirements.",
    icon: Target,
    status: "pending",
  },
  {
    key: "match",
    title: "Score candidate-job fit",
    description: "Compare your skills against the role requirements.",
    icon: Sparkles,
    status: "pending",
  },
  {
    key: "draft",
    title: "Draft tailored application",
    description: "Generate a personalized cover letter and summary.",
    icon: Bot,
    status: "pending",
  },
  {
    key: "submit",
    title: "Submit (simulated)",
    description: "Queue the application — log it to your tracker.",
    icon: Send,
    status: "pending",
  },
];

function HomePage() {
  const runApply = useServerFn(processApplication);

  const [name, setName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [history, setHistory] = useState<ApplyResult[]>([]);

  const setStep = (key: string, status: WorkflowStep["status"]) =>
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, status } : s)),
    );

  const handlePdf = async (file: File) => {
    setResumeFileName(file.name);
    try {
      const txt = await extractPdfText(file);
      setResumeText(txt);
      toast.success("Resume parsed", {
        description: `${txt.length.toLocaleString()} characters extracted`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not read PDF — paste text manually below.");
    }
  };

  const runWorkflow = async () => {
    if (!name.trim() || !resumeText.trim() || !jobDesc.trim()) {
      toast.error("Add your name, resume and a job description first.");
      return;
    }
    setRunning(true);
    setResult(null);
    setSteps(initialSteps.map((s) => ({ ...s, status: "pending" })));

    try {
      setStep("parse", "active");
      await new Promise((r) => setTimeout(r, 500));
      setStep("parse", "done");

      setStep("analyze", "active");
      await new Promise((r) => setTimeout(r, 500));
      setStep("analyze", "done");

      setStep("match", "active");
      setStep("draft", "active");
      const out = (await runApply({
        data: {
          candidateName: name,
          resume: resumeText,
          jobDescription: jobDesc,
        },
      })) as ApplyResult;
      setStep("match", "done");
      setStep("draft", "done");

      setStep("submit", "active");
      await new Promise((r) => setTimeout(r, 700));
      setStep("submit", "done");

      setResult(out);
      setHistory((h) => [out, ...h].slice(0, 10));
      toast.success(`Application drafted for ${out.jobTitle} @ ${out.company}`);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Workflow failed";
      setSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "error" } : s)),
      );
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="min-h-screen pb-20"
      style={{ background: "var(--gradient-soft)" }}
    >
      <Toaster richColors position="top-right" />
      <header className="border-b border-border/60 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">AutoApply</p>
              <p className="text-xs text-muted-foreground">
                AI job application workflow
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Simulated demo
          </Badge>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Automate your job applications
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            with one click.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Drop in your resume and any job description. AI parses both, scores
          your fit, and drafts a tailored cover letter automatically.
        </p>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-[1fr,1.1fr]">
        {/* INPUT */}
        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand" />
            <h2 className="font-semibold">Application inputs</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Resume (PDF)</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 transition hover:bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                {resumeFileName ? (
                  <>
                    <p className="font-medium text-foreground">
                      {resumeFileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resumeText.length.toLocaleString()} chars parsed — click
                      to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">
                      Upload your resume
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, parsed in your browser
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePdf(f);
                }}
              />
            </label>
            <Textarea
              placeholder="Or paste resume text here…"
              rows={4}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jd">Job description</Label>
            <Textarea
              id="jd"
              placeholder="Paste the full job posting…"
              rows={8}
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          </div>

          <Button
            size="lg"
            disabled={running}
            onClick={runWorkflow}
            className="w-full text-primary-foreground shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-hero)" }}
          >
            {running ? "Running workflow…" : "Run automated workflow"}
          </Button>
        </Card>

        {/* WORKFLOW + RESULT */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand" />
              <h2 className="font-semibold">Workflow</h2>
            </div>
            <WorkflowStepper steps={steps} />
          </Card>

          {result && <ResultCard result={result} />}

          {history.length > 1 && (
            <Card className="p-6">
              <h3 className="mb-3 font-semibold">Application history</h3>
              <ul className="space-y-2 text-sm">
                {history.slice(1).map((h, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <span className="truncate">
                      {h.jobTitle} <span className="text-muted-foreground">@ {h.company}</span>
                    </span>
                    <Badge variant="secondary">{h.matchScore}%</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: ApplyResult }) {
  const recColor =
    result.recommendation === "apply"
      ? "bg-success text-primary-foreground"
      : result.recommendation === "review"
        ? "bg-warning text-foreground"
        : "bg-danger text-primary-foreground";

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {result.company}
          </p>
          <h3 className="text-xl font-semibold text-foreground">
            {result.jobTitle}
          </h3>
        </div>
        <div className="text-right">
          <div
            className="inline-flex items-baseline gap-1 rounded-full px-3 py-1 text-primary-foreground"
            style={{ background: "var(--gradient-hero)" }}
          >
            <span className="text-2xl font-bold">{result.matchScore}</span>
            <span className="text-xs opacity-90">/100</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">match score</p>
        </div>
      </div>

      <div
        className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${recColor}`}
      >
        {result.recommendation === "apply" ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="font-medium uppercase tracking-wide">
            {result.recommendation}
          </p>
          <p className="opacity-90">{result.recommendationReason}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Matched skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.matchedSkills.map((s) => (
              <Badge key={s} className="bg-success/15 text-success hover:bg-success/20">
                {s}
              </Badge>
            ))}
            {result.matchedSkills.length === 0 && (
              <p className="text-xs text-muted-foreground">None detected</p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Skill gaps
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.missingSkills.map((s) => (
              <Badge key={s} variant="outline" className="border-warning/50 text-foreground">
                {s}
              </Badge>
            ))}
            {result.missingSkills.length === 0 && (
              <p className="text-xs text-muted-foreground">No major gaps</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Tailored summary
        </p>
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">
          {result.tailoredSummary}
        </p>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Cover letter
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(result.coverLetter);
              toast.success("Copied to clipboard");
            }}
          >
            Copy
          </Button>
        </div>
        <pre className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
          {result.coverLetter}
        </pre>
      </div>
    </Card>
  );
}
