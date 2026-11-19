import { z } from "zod";

/** Reject excessive collections before visiting any elements, including custom refinements. */
export function boundedArray<T extends z.ZodTypeAny>(element: T, maximum: number, message?: string) {
  return z.preprocess((value: z.input<T>[], context) => {
    if (Array.isArray(value) && value.length > maximum) {
      context.addIssue({ code: "too_big", origin: "array", maximum, inclusive: true, message });
      return z.NEVER;
    }
    return value;
  }, z.array(element).max(maximum, message));
}
