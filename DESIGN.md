# Stoa — Design System & Build Rules

These are **hard constraints**, not suggestions. Apply them on every screen.
When a decision isn't covered here, pick the plainer option or ask me — never improvise something fancy.

Save this in the repo (e.g. as `AGENTS.md` or `DESIGN.md`) so it's loaded on every task.

---

## 0. The one rule

This is a utility for studying exam questions, not a marketing site. Optimize for **calm, density, and legibility**. If a screen looks "impressive" or "premium," it's probably wrong — make it look boring and obvious instead.

---

## 1. Tokens — define once, never deviate

### Type
- **One font family** for everything: `Inter` or system-ui. No decorative serif headings. (The serif display is half of what reads as AI-generated. If a serif comes back later, it's a deliberate choice for the wordmark only — not now.)
- **Sizes (px), and nothing in between:** label 12 · body-sm 13 · body 14 · lead 16 · h3 18 · h2 22 · h1 26. **Nothing larger than 28px anywhere on any screen.**
- **Weights:** 400 (body), 500 (medium), 600 (headings/emphasis). No 700+ display weights.
- **Line-height:** 1.5 body, 1.25 headings.

### Spacing
- 4px grid. Allowed values only: **4, 8, 12, 16, 24, 32, 48**.
- Card padding 16 or 20. Gap between sections 24. Page padding 24–32.

### Radius
- **8px** for cards, inputs, and buttons. `9999px` (pill) **only** for tags and avatars. Never mix.

### Color — semantic tokens (CSS vars or Tailwind theme)
Define exactly these and use only these:
`bg, surface, surface-muted, border, text, text-muted, text-subtle, accent, accent-foreground, danger`
- The green **accent is for primary actions and the active nav item only.** Not for labels, not for decoration, not for the leaderboard badges.
- Eyebrow/section labels are `text-muted`, **not** a colored accent. Kill the gold/olive label color.

### Elevation & background
- Prefer **1px borders** over shadows. Cards use a border, not a shadow.
- **One** shadow token total, used only for floating menus/popovers.
- **No gradient backgrounds.** Flat `bg`.

---

## 2. Components — one canonical version each

- **Button:** single shape (radius 8), single height (36–40px). Variants: `primary` (accent fill), `secondary` (border + surface), `ghost` (text only). **Never put a pill and a rectangle next to each other** (your current "Build custom session" pill vs "Review latest mistakes" rectangle is the bug).
- **Card:** `surface` bg + 1px `border`, padding 16–20, radius 8, no shadow. A card *groups* content — it is not decoration.
- **Stat/metric:** muted 13px label (sentence case, not colored caps) + 22px/600 value.
- **Nav item:** icon + label, 36px height. Active = subtle accent bg + accent text. Inactive = `text-muted`.
- **List rows** (questions, sessions, leaderboard): hairline dividers between rows, **not** a boxed card per row.

---

## 3. Copy voice

Plain, functional, sentence case. Name things by what they *do*. **No** marketing, motivation, aphorisms, or exclamation marks.

Rename throughout:

| Now | Use instead |
|---|---|
| Command Center | Dashboard |
| Private Study Hall | (drop it) / Stoa |
| Choose one clean path. | Start a session |
| Build custom session | Custom session |
| Review latest mistakes | Review mistakes |
| Hit these first | Weak topics |
| synced / cache ready | small low-contrast status text, not pills competing with the title |

**Eyebrow labels** (TODAY, GROUP, WEAK SPOTS…): use **at most once** per page, or not at all. Do not stack a colored all-caps label on top of every card.

Buttons keep the same word through the whole flow: a button that says "Save" produces a toast that says "Saved."

---

## 4. Empty states — never fake data

- **Never render seeded/placeholder data styled as if it's real.** No 0%-across-the-board leaderboard, no giant "0".
- A metric with no data shows **"—"**, not a loud "0%".
- An empty section shows **one line of plain text + a single action** ("No sessions yet. Start one."), not a full-weight card pretending to have content.

---

## 5. Layout & hierarchy

- Max content width ~1100–1200px. A real grid (12-col or a simple 2-col); align everything to it.
- **Vary density.** The dashboard must not be 6 identical big padded cards. Cluster small related metrics tightly; give the one primary action room to breathe.
- **One primary action per screen.** Everything else is `secondary` or `ghost`.

---

## 6. Hard "do NOT" list

- ❌ No headline larger than 28px. No hero/landing-page header on app screens.
- ❌ No colored all-caps eyebrow above every card.
- ❌ No element wrapped in a shadowed rounded card by default.
- ❌ No gradient backgrounds or decorative gradients.
- ❌ No more than: **1 font family, 3 weights, 1 box radius, 1 shadow.**
- ❌ No invented grandiose product/section names.
- ❌ No placeholder/seed data shown as real content.
- ❌ No two button shapes in the same view.

---

## 7. How to build (process — follow in order)

1. **Theme first.** Create CSS variables (or `tailwind.config`) implementing every token above, plus a single `/styleguide` page that renders each component once (all button variants, card, stat, nav item, list row, empty state). **Stop and show me this. Do not build screens yet.**
2. After I approve tokens + components, build screens using **only** those components and tokens. No ad-hoc styling, no new colors or sizes.
3. Reuse components everywhere. If you need a new pattern, **add it to `/styleguide` first**, then use it.
4. Use **Tailwind + shadcn/ui** primitives so you're not hand-rolling buttons/inputs (this alone removes most visual-error and inconsistency bugs).
5. Build **one screen at a time** and pause for review. Do **not** one-shot the whole app.
6. When a decision isn't covered here, choose the plainer option or ask. Do not add anything "to make it look better."
