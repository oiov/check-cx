---
name: verify
description: Verify Check CX changes by running the right local checks and manually exercising UI behavior when relevant.
---

Use this skill when validating local changes before reporting them complete.

1. Run `pnpm lint` for any code change.
2. Run `pnpm build` when changes touch routing, server code, dependencies, config, Docker/deployment behavior, or anything that can affect production output.
3. For UI or frontend behavior changes, start the app with `pnpm dev`, open the affected route in a browser, exercise the golden path and obvious edge cases, and check the page for visual regressions.
4. If Supabase schema, migrations, or provider configuration behavior changed, state which migration/config path was checked and whether a staging database replay is still needed.
5. If a check cannot be run because credentials or environment are missing, say exactly what is missing instead of claiming verification succeeded.
