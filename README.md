<div align="center">

# 🎬 YouTubeLM

### Human‑curated videos. AI‑built courses.

The best teaching on the internet lives on YouTube — with zero structure.
**YouTubeLM** lets a person hand‑pick the single best video for each concept, then uses AI
to build a full course around that choice: a summary, a quiz, a final exam, and a tutor you
can chat with — for every chapter.

> **The one thing we deliberately keep away from AI is choosing the video.**
> In an era flooded with AI‑generated content, a human decides what actually explains a
> concept best — and AI amplifies that judgment instead of replacing it.

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-8E75B2?logo=googlegemini&logoColor=white)

</div>

---

## ✨ Overview

Authors build a nested tree — **Course → Units → Chapters** — and, for each chapter, choose
the **single best video** that explains the concept. This choice is intentionally left to a
human: picking what truly teaches a topic is a judgment call, and keeping it out of the model
guarantees a human touch at the heart of every course.

From there, AI does the heavy lifting. YouTubeLM transcribes each video **once** with Gemini
and turns that transcript into a full study layer — summary, quiz, final exam, and a grounded
chat tutor. Learners browse public courses, enroll, watch, take quizzes, chat with a tutor
grounded in the actual video, and track their progress.

**The balance is the point:** human curation decides _what_ to learn from; AI scales _how_
it's taught.

> 🧭 **Live walkthrough:** the app ships a self‑contained demo at <a href="https://youtube-lm.vercel.app/demo" target="_blank" rel="noopener noreferrer">demo</a> —
> product overview, <a href="https://youtube-lm.vercel.app/demo/pitch" target="_blank" rel="noopener noreferrer">pitch deck</a>, and a
> <a href="https://youtube-lm.vercel.app/demo/video" target="_blank" rel="noopener noreferrer">demo video</a>.

---

## 🚀 Features

### For authors

- 🌳 **Visual course builder** — drag‑and‑drop Units & Chapters (dnd‑kit), reorder and move
  chapters across units.
- 💾 **Local‑first editing** — changes buffer in the browser with a `localStorage` backup;
  one **Save** flushes everything in a single call. No request‑per‑keystroke.
- 🤖 **On‑demand AI** — generate per‑chapter summaries and quizzes; the model only processes
  what's new or changed, protecting free‑tier quota.
- ✍️ **Editable & reviewable** — tweak any AI summary or quiz question; edited content is
  tagged **Reviewed by author** and never silently overwritten.
- 🏆 **Final course quiz** — a course‑wide exam, tracked independently and regenerated only
  when chapters are added or removed.
- 📸 **Snapshot publishing** — **Publish** makes a course public; later edits stay private
  until **Publish changes**, so live learners never see half‑finished work.

### For learners

- 🔎 Browse a public catalog of published courses.
- ▶️ Distraction‑free player (privacy‑friendly `youtube-nocookie` embeds) with prev/next.
- 📝 Per‑chapter **Summary**, **Quiz**, and **Chat tutor** tabs, plus a final course quiz.
- 💬 **Grounded chat** — the tutor answers only from the video's transcript, streamed live.
- ✅ **Progress tracking** — mark chapters complete and see per‑course progress on a dashboard.

---

## 🧠 How the AI works

```
YouTube URL ──▶ Gemini (transcribe once) ──▶ stored transcript
                                                   │
                        ┌──────────────────────────┼──────────────────────────┐
                        ▼                           ▼                          ▼
                  Chapter summary            Chapter quiz (Zod)          Chat tutor
                                                   │                    (streamed)
                                                   ▼
                                          Final course quiz
```

- **Transcribe once, reuse everywhere.** Each video is transcribed a single time; summaries,
  quizzes, and chat all read the stored transcript — cheaper and consistent.
- **Structured output.** Quizzes are generated against strict **Zod** schemas so the shape is
  always valid.
- **Answer safety.** The published snapshot contains questions and options but **no correct
  answers** — quizzes are graded **server‑side** via an admin client, so answers never reach
  the browser.
- **Independent freshness.** Summary, quiz, and final‑quiz statuses are tracked separately
  (`idle · processing · ready · error · stale`) to regenerate only what actually changed.

---

## 🛠️ Tech Stack

| Layer        | Choice                                                                         |
| ------------ | ------------------------------------------------------------------------------ |
| Framework    | **Next.js 16** (App Router, Turbopack, `proxy.ts`) · **React 19** · TypeScript |
| Styling      | **Tailwind CSS v4** · shadcn/ui on **Base UI** primitives (Sera style)         |
| AI           | **Vercel AI SDK** + `@ai-sdk/google` (**Gemini**)                              |
| Backend      | **Supabase** — Postgres + Auth (Google OAuth) + Row‑Level Security             |
| Data / state | TanStack Query · Zustand · **Zod** · dnd‑kit                                   |

---

## 📁 Project structure

```
app/
├─ page.tsx                    # Landing
├─ courses/                    # Public catalog + learner view
├─ dashboard/                  # My courses, builder (/edit), preview
├─ demo/                       # Product demo: overview · pitch · video
├─ api/chat/                   # Streaming tutor endpoint
└─ auth/callback/              # Google OAuth callback
components/
├─ builder/                    # Course tree, chapter/quiz/summary dialogs
├─ learn/                      # Learner view, quiz runner, chat panel
├─ demo/                       # Pitch deck
├─ player/ · dashboard/ · ui/
lib/
├─ actions/                    # Server actions (course-tree, ai, enrollment…)
├─ ai/                         # Gemini client + prompts
├─ data/                       # Read helpers (courses, learner, ai)
├─ supabase/                   # Browser / server / admin / middleware clients
└─ schemas/ · store/
supabase-script/migrations/    # 0001…0004 SQL migrations
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js 18+**
- A **Supabase** project (uses the new publishable/secret API keys)
- A **Google Gemini** API key (free tier works)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the example and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable                               | Scope           | Purpose                                            |
| -------------------------------------- | --------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | client          | Supabase project URL                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client          | Browser‑safe key (`sb_publishable_…`)              |
| `SUPABASE_SECRET_KEY`                  | **server only** | Admin key (`sb_secret_…`) — powers the AI pipeline |
| `GEMINI_API_KEY`                       | **server only** | Google Gemini key                                  |

> ⚠️ Never prefix the secret or Gemini key with `NEXT_PUBLIC_` — they must stay server‑side.

### 3. Set up the database

Run the migrations in order from `supabase-script/migrations/` in the **Supabase SQL editor**:

```
0001_init.sql            # tables, RLS, profile + 3-course-limit triggers
0002_snapshot_publish.sql# published_tree snapshot + author-only RLS
0003_split_ai_status.sql # independent summary/quiz status
0004_final_quiz_status.sql # final-quiz status tracking
```

Then enable **Google** as an OAuth provider in Supabase Auth. See <a href="https://supabase.com/docs/guides/auth/social-login/auth-google" target="_blank" rel="noopener noreferrer">setup</a> for the detailed walkthrough.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts

| Command         | Description                |
| --------------- | -------------------------- |
| `npm run dev`   | Start the dev server       |
| `npm run build` | Production build           |
| `npm run start` | Serve the production build |
| `npm run lint`  | Run ESLint                 |

---

## 🗺️ So far What's Done

- ✅ **Phase 1** — Setup, schema + RLS, Google auth
- ✅ **Phase 2** — Course building, browsing, enrollment, progress
- ✅ **Phase 2.5** — Local‑first builder + snapshot publishing
- ✅ **Phase 3** — AI summaries, quizzes, final exam, grounded chat tutor

---

<div align="center">

Built with ▲ Next.js, Supabase, and Google Gemini.

</div>
