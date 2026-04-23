# HeaderLab favicon swap

Replace the stale MHA `favicon.ico` on the web and add-in pages with the
existing HeaderLab PNG/SVG logos from `public/Resources/`. Delete the
obsolete `.ico` files so builds don't re-publish the old Microsoft Header
Analyzer icon.

## Changes

- `src/Pages/headerlab.html` — swap `<link rel="icon">` to SVG + 16/32 PNG
  + `apple-touch-icon`.
- `src/Pages/Default.html` — swap icon links to SVG + 16/32 PNG.
- `src/Pages/DesktopPane.html` — swap icon links to SVG + 16/32 PNG.
- `src/Pages/MobilePane.html` — swap icon links to SVG + 16/32 PNG.
- `favicon.ico` — delete (stale MHA artwork).
- `public/favicon.ico` — delete (stale MHA artwork).

## Notes

PNGs/SVG already exist under `public/Resources/headerlabLogo*.{png,svg}`,
so no new binary assets are introduced. Bare `/favicon.ico` requests from
crawlers will now 404; acceptable — can add a rewrite later if needed.
