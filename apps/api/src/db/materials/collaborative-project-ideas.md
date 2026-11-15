# Class-Wide Collaborative Project Ideas (Days 5–8)

Alternatives to **FlowBoard** designed for **the entire class working together in a single shared GitHub repository** (not split into small isolated team repos).

---

## How a Class-Wide Repository Works (Days 5–8)

To let 10–25+ students contribute to **one shared codebase** without constant chaos:
* **Modular Architecture:** A small shared core (`auth`, `users`, `errorHandler`, `ws`, `db`) + a **module/plugin folder** (`src/modules/<feature>/`) where every student owns their own vertical slice (schema table, Zod schemas, service, routes, tests).
* **Shared Registry:** Every student registers their module in a central file (e.g., `src/modules/index.ts` or `src/app.ts`)—giving the class realistic, controlled merge-conflict practice.
* **GitHub Workflow:** Branch protection on `main` (PRs required, 1 peer approval, green GitHub Actions CI), **GitHub Issues** assigned per student, and a rotating **Release Captain** each day to keep `main` green.
* **Day-by-Day Progression:**
  * **Day 5:** Everyone claims an Issue, creates their Neon Postgres table/migration and CRUD slice, and opens their first PR.
  * **Day 6:** Shared JWT auth + RBAC lands on `main`; every student pulls/rebases `main` and protects their own routes.
  * **Day 7:** Cross-testing—each student writes Vitest + Supertest specs for a *classmate's* module and files Issues for bugs found.
  * **Day 8:** Everyone wires their module into the shared WebSocket event bus and/or scheduled background worker, tags `v1.0.0`, and demos the unified app.

---

## Quick Comparison

| Project | Concept | What Each Student Owns | Shared Core (Neon + Auth + WS) |
| :--- | :--- | :--- | :--- |
| **1. CampusOS** | Class/Bootcamp Portal API | One portal module (`/polls`, `/events`, `/qa`, `/kudos`, etc.) | `users`, `auth`, `notifications`, `ws` |
| **2. ClassPulse** | Unified Data & API Aggregator | One external data source/connector + cache + cron refresh | `users`, `auth`, `api_keys`, `ws` |
| **3. DevArcade** | Class Game & XP Platform | One mini-game/quiz/challenge engine awarding shared XP | `players`, `auth`, `xp_ledger`, `leaderboard` |
| **4. PulseCheck** | Distributed Uptime & Alert Hub | One probe type or alert-channel adapter + monitor rules | `monitors`, `incidents`, `auth`, `ws` |
| **5. EventStage** | Hackathon / Conference Platform | One event subsystem (CFP, voting, schedule, Q&A, check-in) | `users`, `auth`, `events`, `notifications` |
| **6. HabitGuild** | Gamified Study & Habit Guild | One tracker/quest type + streak/reward rules | `users`, `auth`, `guild_feed`, `ws` |

---

## 1. CampusOS — *Class / Bootcamp Portal API*
*(The most natural fit for a single class)*

**Concept:** A unified backend powering the class's own community portal, where every student builds one real feature module that plugs into the shared app.

* **Shared Core:** `users`, JWT `auth` + RBAC (`instructor`, `ta`, `student`), `notifications`, WebSocket feed.
* **Student-Owned Modules (1 per student):**
  * Announcements & pinned posts
  * Live classroom polls
  * Q&A forum & accepted answers
  * Study-group finder & RSVPs
  * Peer kudos / shoutouts
  * Resource & bookmark library
  * Office-hours booking queue
  * Feedback & retro board
* **Day 8 Real-Time & Jobs:** Modules emit events to the shared WebSocket bus (`poll:voted`, `kudos:sent`, `announcement:posted`), and scheduled jobs close expired polls or send office-hour reminders.

---

## 2. ClassPulse — *Unified Data & API Aggregator Hub*

**Concept:** A shared API gateway & dashboard backend where every student builds a different real-world data connector, persists snapshots in Neon, and pushes live updates.

* **Shared Core:** `users`, `auth` (`admin`, `contributor`, `viewer`), `saved_items`, `ws` live ticker.
* **Student-Owned Modules (1 per student):**
  * Weather & air-quality connector
  * GitHub trending repos connector
  * Hacker News / tech news digest
  * Crypto / stock / currency rates
  * Local transit / flight status
  * Sports scores / standings
  * Public holidays & timezone helper
* **Day 8 Real-Time & Jobs:** Each module runs a scheduled `fetchWithRetry` background job to refresh its Neon cache and broadcasts `feed:updated` events over the shared WebSocket server.

---

## 3. DevArcade — *Class-Wide Mini-Game & XP Platform*

**Concept:** A multiplayer arcade backend where every student implements one game or coding-trivia mode, all feeding into a single shared player profile, XP ledger, and live leaderboard.

* **Shared Core:** `players`, `auth` (`admin`, `player`), `xp_ledger` (transactional XP awards), `badges`, `leaderboard`, `ws`.
* **Student-Owned Modules (1 per student):**
  * JS/TS trivia quiz
  * Daily code-output challenge
  * Word / anagram scramble
  * Typing speed duel
  * Number / logic puzzle
  * Rock-paper-scissors tournament
  * Estimation / "guess the number" room
* **Day 8 Real-Time & Jobs:** Games push live `leaderboard:updated` and `badge:unlocked` events over WebSockets; a nightly cron job awards daily-streak bonuses and resets daily challenges.

---

## 4. PulseCheck — *Class-Wide Uptime, Probe & Alerting Platform*

**Concept:** A shared monitoring platform where the class builds a fleet of health probes and alerting integrations against a central incident engine.

* **Shared Core:** `monitors`, `incidents`, `auth` (`admin`, `responder`, `viewer`), `ws` live status board.
* **Student-Owned Modules (1 per student):**
  * Probe types: HTTP JSON assertion, latency threshold, SSL cert expiry, DNS lookup, RSS/Atom check, GitHub Actions status
  * Alert/integration modules: Webhook dispatcher, Slack/Discord formatter, daily digest generator, SLA uptime calculator
* **Day 8 Real-Time & Jobs:** Background cron workers execute probes in parallel, open/resolve incidents transactionally in Neon, and stream `monitor:status_changed` over WebSockets.

---

## 5. EventStage — *Hackathon & Tech Conference Backend*

**Concept:** A complete backend for running a live hackathon or tech conference, with each student owning one subsystem.

* **Shared Core:** `users`, `auth` (`organizer`, `speaker`, `attendee`), `notifications`, `ws`.
* **Student-Owned Modules (1 per student):**
  * Talk / project submissions (CFP)
  * Schedule & room capacity manager
  * Live audience Q&A + upvotes
  * Hackathon team formation board
  * Project judging & rubric scoring
  * Attendee check-in & badge generator
  * Post-session feedback & ratings
* **Day 8 Real-Time & Jobs:** WebSockets push live Q&A upvotes and schedule changes; scheduled jobs auto-close voting windows and notify speakers 15 minutes before sessions.

---

## 6. HabitGuild — *Class-Wide Gamified Study & Habit Tracker*

**Concept:** A collaborative guild where students log daily study/coding habits, complete shared guild quests, and see live progress.

* **Shared Core:** `users`, `auth` (`guild_leader`, `member`), `quests`, `activity_feed`, `ws`.
* **Student-Owned Modules (1 per student):**
  * Coding-streak tracker
  * Reading / article log
  * Flashcard review tracker
  * Peer accountability check-ins
  * Weekly "boss raid" (shared class goal)
  * Milestone & streak-freeze shop
* **Day 8 Real-Time & Jobs:** Completing a habit broadcasts `guild:activity` over WebSockets; a daily cron job resets streaks or processes weekly quest rewards.

---

## Recommendation

* **Easiest for 15–25+ students to work in parallel without stepping on each other:** **CampusOS** or **ClassPulse** — every module is naturally isolated in `src/modules/<name>/` and plugs cleanly into a shared registry.
* **Most fun for a full-class Demo Day:** **DevArcade** — everyone can play each other's games on the shared leaderboard at the end of Day 8.
