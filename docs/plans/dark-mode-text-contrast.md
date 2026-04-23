# Dark mode text contrast bump

Raise dark-mode text colors to pure white for higher contrast.

## Files

- `src/Content/theme.css` — in both the `[data-theme="dark"]` block and the `prefers-color-scheme: dark` block, set `--color-text`, `--color-text-secondary`, and `--color-text-muted` to `#ffffff` (was `#e0e0e0` / `#a0a0a0` / `#6e6e6e`).

## Rationale

Previous dark-mode greys were too dim against the dark surfaces — secondary/muted text was hard to read. Collapsing the three tokens to pure white sacrifices the secondary/muted hierarchy in dark mode but improves legibility. Light mode is unchanged.
