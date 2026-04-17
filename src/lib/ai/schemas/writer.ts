import { z } from "zod";

export const WriterSchema = z.object({
  subject: z.string(),
  body: z.string(),
  body_html: z.string(),
});

export type WriterResult = z.infer<typeof WriterSchema>;

export const writerFallback: WriterResult = {
  subject: "",
  body: "",
  body_html: "",
};
