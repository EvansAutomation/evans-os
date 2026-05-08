# /os-ui — Evans OS Design System Skill

Use this skill when adding or editing any UI in the `/os/` directory. It enforces the design system so everything stays consistent.

## Design tokens (from os.css :root)

```
--bg:#0d0b1a          background
--surface:#16122e     cards, tables
--surface2:#1c1838    hover states, code blocks
--border:#2d2650      default borders
--border2:#3d3468     hover/active borders

--purple-lo:#6b21e8   gradient start
--purple-hi:#a855f7   accent / active
--purple-lt:#c084fc   light accent / labels
--purple-glow:rgba(139,60,247,0.25)

--text:#f0eeff        primary text
--text2:#b8b0d8       secondary text
--muted:#6b6490       placeholder / labels
--error:#f87171       red
--green:#4ade80
--amber:#fbbf24
--blue:#60a5fa

--syne: 'Syne'        headings, labels, badges
--inter: 'Inter'      body text
--radius:10px
--tr:220ms ease
```

## Component patterns

**Stat card:**
```html
<div class="stat-card">
  <div class="stat-value">42</div>
  <div class="stat-label">Label text</div>
</div>
```

**Badge:**
```html
<span class="badge badge-purple">active</span>
<!-- variants: badge-green, badge-amber, badge-red, badge-blue, badge-cyan, badge-ghost -->
```

**Button:**
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-ghost btn-sm">Ghost small</button>
```

**Section title row:**
```html
<div class="sec-title-row">
  <h2 class="sec-title">Title</h2>
  <button class="btn btn-primary btn-sm">+ Add</button>
</div>
```

**Empty state:**
```html
<div class="empty">
  <div class="empty-icon">◈</div>
  <p class="empty-text">Nothing here yet</p>
</div>
```

**Alert:**
```html
<div class="alert alert-error show">Error message</div>
<div class="alert alert-success show">Success</div>
<div class="alert alert-info show">Info</div>
```

**Form field:**
```html
<div class="field">
  <label>Field Label</label>
  <input type="text" placeholder="…">
</div>
```

## Rules

- Always use CSS variables — never hardcode hex colours
- Headings always use `font-family:var(--syne)`
- Purple gradient text: `background:linear-gradient(135deg,#a855f7,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text`
- Card hover: `border-color:var(--border2)` + subtle box-shadow
- Interactive hover lift: `transform:translateY(-2px)` on cards
- Loading button state: add class `loading` (shows `.spinner`, dims `.btn-txt`)
- Use `esc()` from os-core.js for all user-generated strings in innerHTML
- New sections: add to both sidebar nav and mobile bottom nav in index.html
- Modals animate in via `.modal-overlay.open` class toggle

## When asked to add a new module/page

1. Add a `<section class="section" id="sec-NAME">` in index.html
2. Add `<button class="nav-btn" onclick="navigate('NAME')">` in sidebar
3. Add a `<button class="mobile-nav-btn">` in mobile nav
4. Create `/os/js/NAME.js` with a `loadNAME()` function
5. Add `<script src="js/NAME.js">` before `</body>`
6. In `os-core.js` navigate() function, add `if (id === 'NAME') loadNAME();`
