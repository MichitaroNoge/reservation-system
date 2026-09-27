# UI design system

## Principles

- Use Tailwind CSS for layout, spacing, typography, states, and responsive behavior.
- Prefer components in `components/ui` for repeated controls and feedback.
- Keep business rules and data access outside presentational components.
- Design customer screens for guided, single-task flows and admin screens for scanning and repeated operations.
- Every interactive flow should account for loading, empty, error, success, and disabled states.

## Tokens

Semantic colors and radii live in `app/globals.css` as CSS variables and are exposed to Tailwind through `@theme inline`.

- `background` / `foreground`: page surface and primary text
- `card` / `card-foreground`: raised content surfaces
- `primary`: primary actions and active navigation
- `secondary`, `muted`, `accent`: supporting actions and low-emphasis surfaces
- `destructive`, `warning`, `success`: semantic feedback only
- `border`, `input`, `ring`: boundaries and keyboard focus

Use semantic utilities such as `bg-primary`, `text-muted-foreground`, and `border-border`. Avoid adding screen-specific color literals when a semantic token fits.

## Components

Use `Button`, `Input`, `Label`, `Textarea`, `Card`, `Badge`, `Alert`, `Tabs`, `Table`, `Skeleton`, and `EmptyState` before creating a new control. Extend variants in the shared component when the same visual behavior is needed in more than one place.

## Responsive behavior

- Build mobile-first and add `sm`, `md`, and `lg` enhancements.
- Keep customer forms in a readable single column on narrow screens.
- Allow dense admin tables to scroll horizontally while keeping their surrounding actions responsive.
- Provide at least 40px interactive targets and visible keyboard focus.

## Legacy CSS

`app/globals.css` still contains compatibility styles for complex reservation tables, drawers, and the booking wizard. Migrate these incrementally when those screens are changed; do not add new feature-specific global selectors unless Tailwind cannot express the requirement clearly.
