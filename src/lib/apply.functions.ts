import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
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
  matchScore: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()).max(15),
  missingSkills: z.array(z.string()).max(10),
  tailoredSummary: z.string(),
  coverLetter: z.string(),
  recommendation: z.enum(["apply", "review", "skip"]),
  recommendationReason: z.string(),
});

export const processApplication = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI gateway is not configured.");
    }

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const { output } = await generateText({
      model,
      output: Output.object({ schema: OutputSchema }),
      system:
        "You are an expert career coach automating job applications. " +
        "Given a candidate's resume and a job description, extract job info, " +
        "compute a match score, identify matched and missing skills, write a " +
        "tailored 3-sentence professional summary, and a concise cover letter " +
        "(under 220 words, addressed to the hiring manager, no placeholders). " +
        "Be specific, reference real resume facts, and never invent credentials.",
      prompt: `CANDIDATE NAME: ${data.candidateName}

RESUME:
${data.resume}

JOB DESCRIPTION:
${data.jobDescription}`,
    });

    return output;
  });
