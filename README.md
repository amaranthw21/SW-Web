# SW-Web — RP Lore Archive

A lore wiki for our RP setting, built with React + Vite and published on GitHub
Pages.

**Live site:** https://amaranthw21.github.io/SW-Web/
**Editing panel:** https://amaranthw21.github.io/SW-Web/panel

---

## State

The site shell (top bar, sidebar, frame, background), the home page, Credits,
the 404 page, the Bethath islands and these sections:

- **Characters** (`/characters`) — a profile page per character, NPC or
  player character: infobox with the basics, personality, abilities and moves,
  backstory and appearance. Each one picks its island and shows up in that
  island's carousel. Content in `src/content/characters/<id>/`, one folder per
  character with its JSON and pictures.
- **Pokémon** (`/pokemon`) — every Pokémon and Fakemon with its status, types,
  generation, line status, stage and classification. Content in
  `src/content/pokemon/`, one JSON per Pokémon.
- **Items** (`/items`) — an entry page that leads to three lists:
  - **Item list** (`/items/list`) — every item with its type, rarity, prices,
    how to get it and where, or what it's crafted from. Content in
    `src/content/items/`.
  - **Special belongings** (`/items/belongings`) — objects tied to a Pokémon.
    Content in `src/content/belongings/`.
  - **Blessings** (`/items/blessings`) — the blessings legendaries grant.
    Content in `src/content/blessings/`.

All of it was imported once from the server's spreadsheet with
`scripts/import-excel.py` and are edited in the panel from then on. Running the
script again overwrites any edits made in the panel. Owners (the OWNER
column) were added later with `scripts/import-owners.py`, which only fills the
`owner` field and leaves everything else as it is; from then on they're edited
in the panel too.

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
4. A collection in `src/panel/config.yml` so admins can edit it.

## Development

```bash
npm install
npm run dev
```

`npm run lint` and `npm run build` are what CI runs on pull requests. Every push
to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Editing panel

`/panel` (the **Admin** button) is where admins edit the content with forms.
They sign in with a user name and password: owners are set once in the
terminal and invite everyone else from the panel. A Cloudflare Worker in
`worker/` makes the commits for them; their edits arrive as a pull request.
The forms are defined in `src/panel/config.yml`. Setup and limits are in
[`worker/README.md`](worker/README.md). In `npm run dev` it works with no
setup: any name, password `dev`, and edits write to your local files.

## One-time setup on GitHub

- **Settings → Pages → Source: GitHub Actions.**
