# AGENTS.md

## Project structure

This is a single static HTML file site — no build tooling, no package.json, no bundler.

- `index.html` — the entire site (markup, styles, and scripts all inline in one file)

## Architecture notes

- Tailwind CSS is loaded via CDN script tag and configured inline in a `<script>` block in `<head>` (custom brand colors, fonts). There is no Tailwind build/PostCSS pipeline.
- Light/dark theme is toggled by adding/removing a `light`/`dark` class on `<html>`, with overrides defined in a `<style>` block that targets Tailwind's arbitrary-value background/text classes directly (e.g. `.bg-[#070707]`).
- An animated particle/grid background is drawn on a `<canvas>` element via vanilla JS at the bottom of the file (IIFE), reading the current theme class to adjust colors.
- All content (fonts, Tailwind, icons if any) is loaded from CDNs — there are no local static assets to manage.

## Conventions

- Keep everything in `index.html` unless the site grows enough to justify splitting into multiple pages/files — there is currently no build step to stitch separate files back together.
- When adding new themed elements, follow the existing pattern of arbitrary Tailwind color classes plus a matching `html.light` override rule in the `<style>` block, rather than introducing a separate CSS variable system.
