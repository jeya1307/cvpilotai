import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  resume: z.string().min(20).max(20000),
  jobDescription: z.string().min(20).max(20000),
  candidateName: z.string().min(1).max(120),
});

const OutputSchema = z.object({
  jobTitle: z.string().describe("The job title from the description"),
  company: z.string().describe("The company name, or 'Unknown' if not stated"),
  matchScore: z.number().describe("Match score 0-100"),
  matchedSkills: z.array(z.string()).describe("Skills present in both resume and JD"),
  missingSkills: z.array(z.string()).describe("Skills required by JD but missing from resume"),
  tailoredSummary: z.string().describe("3-sentence professional summary tailored to the role"),
  coverLetter: z.string().describe("Concise cover letter under 220 words, no placeholders"),
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

    const { object } = await generateObject({
      model,
      schema: OutputSchema,
      schemaName: "JobApplicationAnalysis",
      system:
        "You are an expert career coach automating job applications. " +
        "Given a candidate's resume and a job description, extract job info, " +
        "compute a match score, identify matched and missing skills, write a " +
        "tailored 3-sentence professional summary, and a concise cover letter " +
        "(under 220 words, addressed to the hiring manager, no placeholders). " +
        "Be specific, reference real resume facts, and never invent credentials. " +
        "Always return valid JSON matching the schema exactly.",
      prompt: `CANDIDATE NAME: ${data.candidateName}

RESUME:
${data.resume}

JOB DESCRIPTION:
${data.jobDescription}`,
    });

    return object;
  });
