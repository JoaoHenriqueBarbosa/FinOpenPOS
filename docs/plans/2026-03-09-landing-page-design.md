# Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `apps/www` — a developer-focused landing page with Neon.com-inspired dark aesthetic, serving as the public face of FinOpenPOS.

**Architecture:** New Next.js app in the monorepo (`@finopenpos/www`, port 3003). SSR with Server Components for Lighthouse 100. CSS-only animations. i18n via next-intl (cookie-based). `apps/web` redirects unauthenticated `/` to `LANDING_URL`. Non-production Dockerfile serves all 3 apps via Nginx reverse proxy.

**Tech Stack:** Next.js 16, Tailwind CSS 4, next-intl, lucide-react, @finopenpos/ui, CSS animations

---

### Task 1: Scaffold apps/www

**Files:**
- Create: `apps/www/package.json`
- Create: `apps/www/tsconfig.json`
- Create: `apps/www/next.config.ts`
- Create: `apps/www/postcss.config.mjs`
- Create: `apps/www/src/app/layout.tsx` (minimal, just renders children)
- Create: `apps/www/src/app/page.tsx` (placeholder "Hello")

**Step 1: Create package.json**

```json
{
  "name": "@finopenpos/www",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo --port 3003",
    "build": "next build",
    "start": "next start --port 3003"
  },
  "dependencies": {
    "@finopenpos/ui": "workspace:*",
    "lucide-react": "catalog:",
    "next": "catalog:",
    "next-intl": "^4.8.3",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "@finopenpos/config": "workspace:*",
    "@tailwindcss/postcss": "^4.2.1",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "postcss": "^8.5.6",
    "tailwindcss": "catalog:",
    "typescript": "^5"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "baseUrl": ".",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create next.config.ts**

```typescript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {};

export default withNextIntl(nextConfig);
```

**Step 4: Create postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

**Step 5: Create minimal layout + page**

`apps/www/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FinOpenPOS",
  description: "Open-source point of sale system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`apps/www/src/app/page.tsx`:
```tsx
export default function Home() {
  return <div>FinOpenPOS Landing</div>;
}
```

**Step 6: Update monorepo config**

Add to root `package.json` scripts:
```json
"dev:www": "turbo -F @finopenpos/www dev"
```

**Step 7: Run `bun install` and verify dev server starts**

```bash
bun install
bun run dev:www
```
Expected: App runs on http://localhost:3003

**Step 8: Commit**

```
feat(www): scaffold landing page app
```

---

### Task 2: Neon-Inspired Design System (globals.css)

**Files:**
- Create: `apps/www/src/app/globals.css`
- Modify: `apps/www/src/app/layout.tsx` (import css, add font, dark class)

**Step 1: Create globals.css with Neon color palette**

Neon design tokens (extracted from neon.com):
- Backgrounds: `#0C0D0D`, `#0A0A0B`, `#111215`, `#151617`
- Light sections: `#E4F1EB`, `#EBF5F0`, `#F6FDFA`, `#CAE6D9`
- Green primary: `#2C6D4C`, accent: `#34D59A`, dark: `#285D49`, mid: `#37C38F`
- Grays: 12-step scale from near-black to near-white
- Text: `#C9CBCF`, `#94979E`, `#A3A6B3`, `#C2C4CC`, white
- Shadows dark: `0px 8px 20px 0px rgba(0,0,0,.4)`
- Glow gradient: `linear-gradient(90deg, rgba(57,165,125,0.6) ...)`
- Blur: `backdrop-blur-[15px]`
- Border radius: `rounded-sm` (0.125rem) default
- Typography: `font-medium`/`font-normal`, headings 28-80px, `tracking-tighter`, `leading-dense`

Create CSS with custom properties, Tailwind theme extensions, glow keyframes, and utility classes for the Neon aesthetic.

**Step 2: Update layout.tsx**

- Import globals.css
- Add Inter font via `next/font/google` with `display: "swap"`
- Force dark mode with `className="dark"` on `<html>`
- Set `bg-[#0C0D0D] text-white antialiased` on body

**Step 3: Verify visually**

Run dev server, confirm dark background renders correctly.

**Step 4: Commit**

```
feat(www): add neon-inspired design system
```

---

### Task 3: i18n Setup

**Files:**
- Create: `apps/www/src/i18n/config.ts`
- Create: `apps/www/src/i18n/request.ts`
- Create: `apps/www/src/i18n/locale.ts`
- Create: `apps/www/src/messages/en.ts`
- Create: `apps/www/src/messages/pt-BR.ts`
- Modify: `apps/www/src/app/layout.tsx` (add NextIntlClientProvider)

**Step 1: Create i18n config files**

Copy pattern from `apps/web/src/i18n/` — same cookie-based approach, same locales.

**Step 2: Create message files**

Landing page sections: `hero`, `problem`, `techStack`, `features`, `getStarted`, `cta`, `footer`, `common` (locale switcher labels).

**Step 3: Wire up layout.tsx with NextIntlClientProvider**

**Step 4: Verify i18n works**

Set cookie `locale=pt-BR`, confirm text changes.

**Step 5: Commit**

```
feat(www): add i18n with next-intl
```

---

### Task 4: Header/Nav Component

**Files:**
- Create: `apps/www/src/components/header.tsx`
- Create: `apps/www/src/components/locale-switcher.tsx`
- Modify: `apps/www/src/app/layout.tsx` (add Header)

**Step 1: Build Header**

- Sticky header with backdrop-blur, border-bottom
- Logo (FinOpenPOS text or icon)
- Nav links: Features, Docs, GitHub
- Locale switcher (en/pt-BR)
- CTA button: "Get Started" / "Star on GitHub"
- Mobile: hamburger menu
- Style: `bg-[#0C0D0D]/80 backdrop-blur-[15px] border-b border-[#1a1a1a]`

**Step 2: Build LocaleSwitcher**

Dropdown or toggle, sets cookie, triggers page refresh.

**Step 3: Commit**

```
feat(www): add header with nav and locale switcher
```

---

### Task 5: Hero Section

**Files:**
- Create: `apps/www/src/components/sections/hero.tsx`
- Modify: `apps/www/src/app/page.tsx` (add Hero)

**Step 1: Build Hero**

- Full-viewport height section
- Bold headline: problem statement (e.g., "The open-source POS Brazil deserves")
- Subheadline: brief description
- Two CTAs: "View on GitHub" (primary green), "Read the Docs" (outline)
- Background: radial gradient glow effect (green) + subtle grid/dot pattern via CSS
- CSS animation: gentle pulse on the glow, fade-in on text
- Responsive: 60px heading → 28px on mobile (matching Neon's scale)

**Step 2: Commit**

```
feat(www): add hero section
```

---

### Task 6: Problem/Solution Section

**Files:**
- Create: `apps/www/src/components/sections/problem.tsx`
- Modify: `apps/www/src/app/page.tsx`

**Step 1: Build Problem/Solution**

- Dark section with green accent text for key phrases
- Storytelling approach: "Brazil has X million small businesses... no open-source POS exists..."
- Show don't tell: contrast "before" (expensive/closed) vs "after" (free/open)
- Typography: large indent style (like Neon h2: `indent-24 text-[48px]`)
- `<strong>` tags in white, rest in `gray-new-50` (#94979E)

**Step 2: Commit**

```
feat(www): add problem/solution section
```

---

### Task 7: Tech Stack Section

**Files:**
- Create: `apps/www/src/components/sections/tech-stack.tsx`
- Modify: `apps/www/src/app/page.tsx`

**Step 1: Build Tech Stack**

- Light green background section (`#E4F1EB`) for visual contrast
- Grid of tech cards: PGLite, Next.js 16, Drizzle ORM, Tailwind CSS 4, tRPC, Better Auth
- Each card: icon/logo, name, one-line description of WHY it was chosen (not what it is)
- Cards: `border border-[#CAE6D9] bg-white/60 backdrop-blur-[15px] rounded-sm shadow`
- Text color: `text-[#0C0D0D]` (dark on light bg)

**Step 2: Commit**

```
feat(www): add tech stack section
```

---

### Task 8: Features Section

**Files:**
- Create: `apps/www/src/components/sections/features.tsx`
- Modify: `apps/www/src/app/page.tsx`

**Step 1: Build Features**

- Dark section
- Key features: POS, Fiscal (NF-e/NFC-e), Multi-tenancy, Offline-first (PGLite), Dashboard/Analytics, i18n
- Each feature: icon (lucide-react), title, description
- Layout: 2-3 column grid, responsive
- Subtle green glow on hover (CSS transition)
- Style: cards with `border-[#1a1a1a] bg-[#111215]`

**Step 2: Commit**

```
feat(www): add features section
```

---

### Task 9: Social Proof Section (GitHub Stats)

**Files:**
- Create: `apps/www/src/components/sections/social-proof.tsx`
- Create: `apps/www/src/lib/github.ts` (fetch stars/contributors)
- Modify: `apps/www/src/app/page.tsx`

**Step 1: Create GitHub data fetcher**

Server-side fetch with `revalidate: 3600` (1h cache):
- Stars count
- Contributors count
- Latest release/tag
- Open issues count

Use GitHub REST API (no auth needed for public repos).

**Step 2: Build Social Proof section**

- Stats row: stars, contributors, commits, license badge
- Animated counting numbers (CSS counter or server-rendered)
- "Join X developers building the future of POS in Brazil"
- Contributor avatars grid (top contributors from API)

**Step 3: Commit**

```
feat(www): add social proof section with live github stats
```

---

### Task 10: Getting Started Section

**Files:**
- Create: `apps/www/src/components/sections/getting-started.tsx`
- Modify: `apps/www/src/app/page.tsx`

**Step 1: Build Getting Started**

- Terminal-style code block with copy button
- Steps: clone, install, dev
- Syntax highlighting via CSS (green for commands, gray for comments)
- Dark card with `bg-[#0A0A0B] border border-[#1a1a1a] rounded-sm`
- Monospace font for code

**Step 2: Commit**

```
feat(www): add getting started section
```

---

### Task 11: CTA + Footer

**Files:**
- Create: `apps/www/src/components/sections/cta.tsx`
- Create: `apps/www/src/components/footer.tsx`
- Modify: `apps/www/src/app/page.tsx`
- Modify: `apps/www/src/app/layout.tsx` (add Footer)

**Step 1: Build CTA**

- Full-width section with `bg-[#151617]`
- Large heading (80px → 32px responsive): "Ready to contribute?"
- Two buttons: "Star on GitHub", "Read the Docs"
- Subtle green gradient glow behind the heading

**Step 2: Build Footer**

- Links: GitHub, Docs, License (MIT)
- "Built with" tech badges
- Border top `border-[#1a1a1a]`

**Step 3: Commit**

```
feat(www): add cta and footer
```

---

### Task 12: LANDING_URL Redirect in apps/web

**Files:**
- Modify: `packages/env/src/server.ts` (add LANDING_URL)
- Modify: `apps/web/src/proxy.ts` (redirect `/` to LANDING_URL)
- Modify: `apps/web/src/app/page.tsx` (add redirect as fallback)

**Step 1: Add LANDING_URL to env**

In `packages/env/src/server.ts`, add:
```typescript
LANDING_URL: z.string().url().optional(),
```

**Step 2: Update proxy.ts**

When path is exactly `/` and `LANDING_URL` is set and user is not authenticated → redirect to `LANDING_URL`.

```typescript
import { env } from "@finopenpos/env/server";

// At the top of the proxy function, before the auth check:
if (pathname === "/" && env.LANDING_URL) {
  return NextResponse.redirect(env.LANDING_URL);
}
```

**Step 3: Update page.tsx as fallback**

```tsx
import { redirect } from "next/navigation";
import { env } from "@finopenpos/env/server";

export default function Home() {
  if (env.LANDING_URL) {
    redirect(env.LANDING_URL);
  }
  redirect("/login");
}
```

**Step 4: Commit**

```
feat(web): redirect root to LANDING_URL
```

---

### Task 13: Update Dockerfile (non-production)

**Files:**
- Modify: `Dockerfile`

**Step 1: Update Dockerfile**

- `deps` stage: add `apps/www/package.json` and `apps/docs/package.json` COPY
- `build` stage: run `turbo build` (builds all 3 apps)
- `runtime` stage: copy all 3 `.next` builds + node_modules
- Add Nginx config: `/` → www:3003, `/app` → web:3001, `/docs` → docs:3002
- Create: `nginx.conf`
- Create: `docker-entrypoint.sh` — starts 3 `next start` processes + nginx
- Install nginx in runtime stage

**Step 2: Commit**

```
feat(docker): add www and docs to non-production dockerfile
```

---

### Task 14: Final Polish & Verification

**Step 1: Run `bun run build` from root**

Verify all 3 apps build successfully.

**Step 2: Run Lighthouse audit**

```bash
npx lighthouse http://localhost:3003 --only-categories=performance,accessibility,best-practices,seo
```

Target: 100/100/100/100

**Step 3: Test i18n**

Verify both en and pt-BR render correctly.

**Step 4: Test responsive**

Check mobile, tablet, desktop breakpoints.

**Step 5: Final commit**

```
feat(www): polish and verify landing page
```
