# UI implementation rules

- Use Tailwind CSS as the default styling approach. Keep `app/globals.css` limited to Tailwind imports, design tokens, global element rules, and genuinely exceptional legacy styles.
- Prefer reusable components from `components/ui` before creating page-specific controls. Follow shadcn/ui composition patterns and Radix primitives for interactive widgets.
- Use the shared semantic tokens (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `border`, `input`, and `ring`) instead of hard-coded page colors.
- Keep cards at an 8px radius or less. Use restrained shadows and avoid nested decorative cards.
- Use Lucide icons for common actions. Icon-only buttons require an accessible label or title.
- Forms must include visible labels, field-level validation, loading and error states, and mobile-friendly controls. Use React Hook Form and Zod for non-trivial forms.
- Tables must remain scannable on desktop and horizontally scroll on narrow screens. Keep primary row actions visible and avoid shrinking text below 12px.
- Every screen must account for loading, error, empty, success, and disabled states where applicable.
- Destructive actions require confirmation. Preserve existing business rules and API behavior when changing UI.
- Verify important customer and management flows at desktop and mobile widths. Run `npm test` and `npm run build` before completion.
