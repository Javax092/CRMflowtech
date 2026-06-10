import { ContactEventType, LeadSource, LeadStatus, OfferedService, PipelineStage, ScriptType, Segment } from "@prisma/client";
import { z } from "zod";

const emptyToNull = z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional());
const dateField = z.preprocess((value) => (value ? new Date(String(value)) : null), z.date().nullable().optional());
const moneyField = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return null;
    return Number(String(value).replace(",", "."));
  },
  z.number().nonnegative().nullable().optional()
);

export const leadSchema = z
  .object({
    responsibleName: emptyToNull,
    companyName: emptyToNull,
    segment: z.nativeEnum(Segment),
    instagram: emptyToNull,
    whatsapp: emptyToNull,
    email: emptyToNull,
    city: emptyToNull,
    websiteUrl: emptyToNull,
    demoUrl: emptyToNull,
    demoSlug: emptyToNull,
    offeredService: z.nativeEnum(OfferedService),
    proposedValue: moneyField,
    status: z.nativeEnum(LeadStatus),
    pipelineStage: z.nativeEnum(PipelineStage).optional(),
    source: z.nativeEnum(LeadSource),
    notes: emptyToNull,
    firstContactAt: dateField,
    lastContactAt: dateField,
    nextFollowUpAt: dateField,
    followUpType: emptyToNull,
    nextStepNote: emptyToNull,
    forceDuplicate: z.preprocess((value) => value === "true" || value === true, z.boolean()).default(false)
  })
  .superRefine((data, ctx) => {
    if (!data.responsibleName && !data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o nome da empresa ou do responsável.",
        path: ["companyName"]
      });
    }

    if (!data.whatsapp && !data.instagram && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe pelo menos um canal de contato.",
        path: ["whatsapp"]
      });
    }
  });

export const historySchema = z.object({
  type: z.nativeEnum(ContactEventType),
  title: z.string().min(2, "Informe um título."),
  message: emptyToNull
});

export const scriptSchema = z.object({
  name: z.string().min(2, "Informe o nome do script."),
  type: z.nativeEnum(ScriptType),
  content: z.string().min(10, "O script precisa ter pelo menos 10 caracteres."),
  active: z.preprocess((value) => value === "true" || value === "on" || value === true, z.boolean()).default(true)
});

export const demoSiteSchema = z.object({
  name: z.string().min(2, "Informe o nome da demo."),
  segment: z.string().min(2, "Informe o segmento."),
  url: z.string().url("Informe uma URL válida."),
  reference: emptyToNull,
  description: emptyToNull,
  stack: emptyToNull,
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  notes: emptyToNull
});

export const pipelineStageSchema = z.object({
  pipelineStage: z.nativeEnum(PipelineStage)
});

export const scheduleFollowUpSchema = z.object({
  nextFollowUpAt: dateField.refine((value) => value instanceof Date && !Number.isNaN(value.getTime()), "Informe uma data válida."),
  followUpType: emptyToNull,
  nextStepNote: emptyToNull
});

export const generatedMessageSchema = z.object({
  type: z.string().min(2, "Informe o tipo da mensagem."),
  message: z.string().min(10, "Gere uma mensagem antes de salvar.")
});

export const linkDemoSchema = z.object({
  demoSiteId: z.string().min(1, "Selecione uma demo.")
});

export const leadApproachSchema = z.object({
  recommendedProduct: emptyToNull,
  demoUrl: emptyToNull,
  demoSlug: emptyToNull,
  audit: emptyToNull,
  approachScript: z.string().trim().min(20, "A abordagem precisa ter pelo menos 20 caracteres.")
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
