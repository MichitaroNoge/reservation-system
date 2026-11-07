import { z } from "zod";

/** Zod 3 checks .max() after parsing each element; reject excessive collections first. */
export function boundedArray<T extends z.ZodTypeAny>(element: T, maximum: number, message?: string) {
  return z.preprocess((value, context) => {
    if (Array.isArray(value) && value.length > maximum) {
      context.addIssue({ code: z.ZodIssueCode.too_big, type: "array", maximum, inclusive: true, message, fatal: true });
      return z.NEVER;
    }
    return value;
  }, z.array(element).max(maximum, message));
}
