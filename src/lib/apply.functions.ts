import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  resume: z.string().min(20).max(20000),
  jobDescription: z.string().min(20).max(20000),
  candidateName: z.string().min(1).max(120),
});

const OutputSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  matchScore: z.number(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  tailoredSummary: z.string(),
  coverLetter: z.string(),
  recommendation: z.enum(["apply", "review", "skip"]),
  recommendationReason: z.string(),
});

type Output = z.infer<typeof OutputSchema>;

export type ApplyResponse =
  | { ok: true; data: Output }
  | { ok: false; error: string; rawText?: string; partial?: unknown };

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    return undefined;
  }
}

function fallback(partial: Partial<Output> | undefined, reason: string): Output {
  const p = (partial ?? {}) as Partial<Output>;
  return {
    jobTitle: typeof p.jobTitle === "string" ? p.jobTitle : "Unknown role",
    company: typeof p.company === "string" ? p.company : "Unknown",
    matchScore: typeof p.matchScore === "number" ? p.matchScore : 0,
    matchedSkills: Array.isArray(p.matchedSkills) ? p.matchedSkills.map(String) : [],
    missingSkills: Array.isArray(p.missingSkills) ? p.missingSkills.map(String) : [],
    tailoredSummary:
      typeof p.tailoredSummary === "string"
        ? p.tailoredSummary
        : `Could not generate a tailored summary (${reason}).`,
    coverLetter:
      typeof p.coverLetter === "string"
        ? p.coverLetter
        : `Could not generate a cover letter (${reason}).`,
    recommendation:
      p.recommendation === "apply" || p.recommendation === "review" || p.recommendation === "skip"
        ? p.recommendation
        : "review",
    recommendationReason:
      typeof p.recommendationReason === "string" ? p.recommendationReason : reason,
  };
}

export const processApplication = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ApplyResponse> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "AI gateway is not configured." };
    }

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const system =
      "You are an expert career coach automating job applications. " +
      "Return ONLY a single JSON object (no prose, no markdown fences) with these keys: " +
      "jobTitle (string), company (string), matchScore (number 0-100), " +
      "matchedSkills (string[]), missingSkills (string[]), " +
      "tailoredSummary (string, 3 sentences), coverLetter (string, under 220 words), " +
      "recommendation ('apply'|'review'|'skip'), recommendationReason (string). " +
      "Reference real resume facts. Never invent credentials.";

    let rawText = "";
    try {
      const result = await generateText({
        model,
        system,
        prompt: `CANDIDATE NAME: ${data.candidateName}

RESUME:
${data.resume}

JOB DESCRIPTION:
${data.jobDescription}

Respond with the JSON object only.`,
      });
      rawText = result.text ?? "";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("AI call failed:", message);
      return { ok: true, data: fallback(undefined, `AI request failed: ${message}`) };
    }

    const parsed = extractJson(rawText);
    if (parsed === undefined) {
      console.error("AI returned non-JSON output:", rawText.slice(0, 500));
      return {
        ok: true,
        data: fallback(undefined, "Model did not return valid JSON."),
      };
    }

    const validated = OutputSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("AI JSON failed schema:", validated.error.message);
      return {
        ok: true,
        data: fallback(parsed as Partial<Output>, "Model JSON did not match schema."),
      };
    }

    return { ok: true, data: validated.data };
  });
