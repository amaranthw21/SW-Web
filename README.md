# SW-Web — RP Lore Archive

A lore wiki for our RP setting, built with React + Vite and published on GitHub
Pages. It follows the same model as
[PU-Web](https://github.com/amaranthw21/PU-Web): same layout, same frame, same
form-based editing panel.

**Live site:** https://amaranthw21.github.io/SW-Web/
**Editing panel:** https://amaranthw21.github.io/SW-Web/admin/

---

## State

This is the empty base: the site shell (top bar, sidebar, frame, background),
the home page, Credits and the 404 page. The sections of the setting are still
to be added.

Carried over from PU-Web and ready to reuse when sections are added:

- `src/components/` — `Card`, `EntryCard`, `Accordion`, `ContentBlock`,
  `ContentToc`, `CountryQuote` (quote chat), `CountryRegions`, `InfoboxValue`,
  `Paragraphs`.
- `src/lib/` — `asset` (base path), `slug`, `blocks`, `useDocumentTitle`,
  `usePageAccent`, `placeholders`.
- `src/index.css` — the full stylesheet from PU-Web.

## Adding a section

1. Content in `src/content/<section>/` (one JSON per entry) and a loader in
   `src/data/`.
2. Pages in `src/pages/` and routes in `src/App.jsx`.
3. An entry in `SECTIONS` in `src/components/Sidebar.jsx` (icon in
   `NavIcons.jsx`).
4. A collection in `public/admin/config.yml` so mods can edit it.

## Development

```bash
npm install
npm run dev
```

`npm run lint` and `npm run build` are what CI runs on pull requests. Every push
to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## One-time setup on GitHub

- **Settings → Pages → Source: GitHub Actions.**
- The CMS signs in through the same OAuth worker as PU-Web
  (`base_url` in `public/admin/config.yml`). If the worker restricts allowed
  origins or repos, add SW-Web there.
