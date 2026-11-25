# Trazo · Plan v12.4 (25 Nov 2026) — source of truth

Consolidated. REPLACES every addendum sent after v12.2 (Alawys, the JulIA/HandyX swap, the 3-week secondary pace, the daily background hours, the heavy "v2" secondary apps, the commercial sectors and the PNPT dates). Everything from v12.2 that this document does not mention stays as it is.

## Answers (25 Nov 2026)

1. Clear the confirmed shifts (`plan.corrimientos`) in the migration and keep a backup for undo. Keep booked exams, logged hours, ticks, notes, leads and posts. If PetrIA's real progress differs from the new baseline, show it as ahead/behind against the v12.4 dates; the baseline does not move for it.
2. Ticking a background hour logs 60 min of review time to that track (secondary or commercial); the minutes stay editable afterwards (e.g. 40 min).
3. Weekly review targets: 1 h per active day of that track.
4. Cert day plans, math milestones and PetrIA batches are spread proportionally inside the new windows.
5. Heavy secondary apps start with empty repo name/URL.
6. Slot #1: keep the 3 Dec brief, skip the automatic one.
7. Background on fixed days off: NO. Rests are rests. BOTH background tracks pause on every fixed day off (20–26 Dec 2027, 31 Dec 2027–6 Jan 2028, 9–15 Jun 2028), not only in the PNPT window. Slot #19 just pauses its sell phase those days and resumes after.
8. Zero buffer: 14 Dec 2028 is an estimate, not a deadline; no buffer is added. Delay alert: when the cumulative delay of the principal track passes 7 days, show it on Today and in the Sunday review with the new estimated end date and a suggestion (pause commercial first, then secondary). Re-check after the first 3 weeks with real data (13 Dec 2026).

## 1. Capacity and routine (new)
- Weekdays = 10 focus hours: Block 1 04:30–08:30 · Block 2 12:00–18:00. Work 10:00–12:00. Abi + run 08:30–10:00. Training 18:00–20:00. Sleep 21:00.
- Weekends = 11 focus hours: Block 1 04:30–08:30 · Block 2 10:00–17:00. Free from 17:00.
- Background time comes OUT of those hours, never after them:
  - Secondary track: 1 h/day while a secondary app is active (weekdays 16:00–17:00, weekends 11:30–12:30).
  - Commercial track: 1 h/day while a commercial slot is active (weekdays 17:00–18:00, weekends 12:30–13:30).
  - When a track has nothing active, its hour goes back to the principal track.
- Close-out: weekdays 13:45–16:00 (PR review, English, Trazo recall, Anki, posts and applications, read tomorrow's lesson). Weekends 13:30–15:45, then 15:45–17:00 Saturday demo + mock interview / Sunday weekly review.
- Principal capacity therefore: 8 h weekdays / 9 h weekends with both background tracks active; 9/10 with one; 10/11 with none. In cert, English, math and job-search windows the commercial hour comes out of the study hours.
- Extra: 5–11 Dec 2026, 1 h/day of PetrIA goes to building Alawys v0.1 (PC arrives 5 Dec).
- Fixed days off: 20–26 Dec 2027 (fixed pause), 31 Dec 2027–6 Jan 2028 (rest), 9–15 Jun 2028 (rest). Work flows around them.
- Delays: absorbers in order Consolidation → stage closes → final close, minimum 3 days each. Rests are never used. Booked exams never move. If a cert's mocks are < 85% or a math window is behind its milestones, suggest pausing that window's commercial hour. Always suggestions; nothing moves without my confirmation.
- Sunday review adds: review time this week vs target (secondary 7 h, commercial 7 h when active), Claude usage % (I type it; threshold 85% → suggest pausing commercial first, then secondary).

## 2. Track rules (updated)
- Tracks: principal (foreground), secondary (my own apps, background), commercial (brand showcases, background), plus open-source tools (see section 3).
- Secondary apps: built by Claude Code in the background, each in its own repo, versions = one week each (heavy "v2" apps: v3.0 takes two weeks). I review and fix 1 h/day.
- Commercial slots: days 1–7 = build; days 8+ of the slot = SELL: pitch to the brand + 10 similar businesses, each tracked as a lead (name, date, channel, status). Slots of 7 days or less = build only. Brand pick reminder 14 days before each slot asks: "regional brand for clients, or big brand for noise?" and stores the answer.
- "<Company> v2" names are used only in posts and pitches. Every repo has its own name, own design, no logos, the label "concepto no oficial, sin relación con la marca", simulated data labelled as simulated, no login or payment flow that imitates the real brand.
- Foreground review (checkbox that blocks "done") for anything touching money, personal data, security or smart contracts; flags per version below.
- Crypto only on testnet; real payments only via Mercado Pago. HandyX escrow stays internal. Voice agents disclose AI and recording; no voice cloning. Spotify v2 and Clip Studio: only audio/video with an open licence or permission; official APIs only. Load tests never hit the real LLM API.
- Background pauses: PNPT window and every fixed day off.
- Imán gate (8 points, steps 1–3 of the post series before publishing): v3.0 of every principal and secondary app; the single release of every commercial slot; Alawys v1.0; mcp-ar v2.

## 3. Open source: Alawys + tools
- Alawys = principal-track TOOL item (kind: standalone), packages create-alawys + scope @alawys/*, MIT, my personal account, npm with 2FA and --provenance.
  - v0.1 · 5–11 Dec 2026 · background with the new PC: presets web-next, mern, petria; agents pack (CLAUDE.md + subagents); Docker; CI; validated .env.example; gitleaks.
  - v0.2 · 28 Dec 2026 · inside VitalIA batch 0.1: preset vitalia (.NET + Azure).
  - v1.0 LAUNCH · 8 Jan 2027 · VitalIA close · Imán gate. Metric: tokens and minutes per scaffold, Claude vs Alawys (measured on Aquasol, HandyX, VitalIA).
  - v1.x · batch 0.1 of later projects adds missing presets (Rails, Rust, Go, Python ML, Rust/Go, .NET + Rust, Julia).
  - v2.0 · inside Constelación (16–21 May 2027): add agents / add mcp / @alawys/mcp.
- Every project from VitalIA on starts with "0.1 · Arranque" (generated with Alawys + preset if missing). Secondary apps from HandyX on and every commercial slot from #1 Aquasol on are also generated with Alawys (JulIA is not: it starts before Alawys).
- Tools: max ONE new tool per project; extensions don't count. kind = extracted (published only when a second item needs it: field "needed by") or standalone (public from day one). Checklist: tests · README · example · semver · published with provenance. One Thursday post per tool.
  - bkt (standalone) · JulIA v3.0 · 16 Dec 2026
  - showcase-kit (extracted: Aquasol → Cinemacenter) · 15 Jan 2027
  - captions (extracted: JulIA → Clip Studio v2) · 20 Jan 2027
  - seat-picker (extracted: Cinemacenter → miboletería) · 3 Feb 2027
  - voice-agent (extracted: PetrIA voice-gateway → McDonald's) · 28 Feb 2027
  - tour3d (extracted: Roofy → Airbnb v2) · 8 Sep 2027
  - the rest are listed under each principal project in section 4.
- Open source page: package, version, kind, origin, needed by, date, downloads (I type them), link.

## 4. COMPLETE FOREGROUND SCHEDULE (v12.4)
(h = planned hours; every project lists its 0.1 Arranque, version dates, open-source deliverable and the BACKGROUND running behind it. Cert study plans, math milestones and English content keep their v12.2 sequence; only the dates move.)

### STAGE 1 · CORE
PHASE 1 · AI Full-stack Engineer
- PROJECT PetrIA · 21 Nov–12 Dec 2026 · 193.5 h
  · versions: 1.0 21–25 Nov · 1.1 26–30 Nov · 2.0 1–5 Dec · 3.0 6–12 Dec
  · deadlines unchanged: 1.0 1 Dec · 1.1 12 Dec · 2.0 22 Dec 2026 · 3.0 5 Jan 2027
  · open source: Alawys v0.1 built in the background 5–11 Dec 2026 (1 h/day taken from PetrIA)
  · BACKGROUND → secondary: JulIA v1.0–v3.0 · commercial: none
- CERT V1: Claude Certified Architect (30 h) + GitHub Foundations (12 h) · 13–18 Dec 2026 · 42 h
  · BACKGROUND → secondary: JulIA v3.0 · HandyX v1.0 · commercial: slot #1 (build)
- ENGLISH E#1 (English Made Simple, first half) · 19–27 Dec 2026 · 72 h
  · BACKGROUND → secondary: HandyX v1.0–v2.0 · commercial: slot #1 (build + sell)
- PROJECT VitalIA · 28 Dec–8 Jan 2027 · 102 h
  · 0.1 Arranque = Alawys v0.2 (preset vitalia, .NET) + scaffold VitalIA with it + measure tokens/minutes
  · versions: 1.0 28–30 Dec · 1.1 31 Dec–2 Jan · 2.0 3–5 Jan · 3.0 6–8 Jan
  · open source: Alawys v1.0 LAUNCH at VitalIA close (Imán gate)
  · BACKGROUND → secondary: HandyX v2.0–v3.0 · Clip Studio v1.0 · commercial: none
- CERT V2: Azure AI-103 (45 h) + Databricks GenAI Associate, optional (35 h) · 9–18 Jan 2027 · 82 h
  · BACKGROUND → secondary: Clip Studio v1.0–v2.0 · commercial: slot #2 (build + sell)
- ENGLISH E#2 (EMS to the end + Pronunciation; book Cambridge C1) · 19–27 Jan 2027 · 72 h
  · BACKGROUND → secondary: Clip Studio v2.0–v3.0 · commercial: slot #2 (sell)
PHASE 2 · ML Engineer
- MATH W1 · 28 Jan–21 Feb 2027 · 206 h
  · BACKGROUND → secondary: Roofy v1.0–v3.0 · Amazon v2 v1.0 · commercial: slot #3 (build + sell)
- CERT V3: AWS MLA-C02 (65 h) + GitHub Actions (15 h) · 22 Feb–3 Mar 2027 · 82 h
  · BACKGROUND → secondary: Amazon v2 v1.0–v2.0 · commercial: slot #4 (build + sell)
- ENGLISH E#3 (Pronunciation + C1 intensive) · 4–12 Mar 2027 · 72 h
  · BACKGROUND → secondary: Amazon v2 v3.0 · commercial: slot #4 (sell)
- PROJECT AgrIA · 13–25 Mar 2027 · 115 h
  · 0.1 Arranque = Alawys + Rails preset
  · versions: 1.0 13–15 Mar · 1.1 16–19 Mar · 2.0 20–22 Mar · 3.0 23–25 Mar
  · open source: mcp-ar v1 (standalone: energy + agro)
  · BACKGROUND → secondary: Amazon v2 v3.0 · Stripe v2 v1.0–v2.0 · commercial: none
- CERT V4: AWS SAA-C03 (65 h, AWS Network Lab inside) + Prometheus PCA (15 h) · 26 Mar–4 Apr 2027 · 82 h
  · BACKGROUND → secondary: Stripe v2 v2.0–v3.0 · commercial: slot #5 (build + sell)
- ENGLISH E#4 + Cambridge C1 exam · 5–13 Apr 2027 · 72 h
  · BACKGROUND → secondary: Stripe v2 v3.0 · commercial: slot #5 (sell)
PHASE 3 · Systems / Realtime
- PROJECT Antena · 14 Apr–1 May 2027 · 160 h
  · 0.1 Arranque = Alawys + Rust preset
  · versions: 1.0 14–18 Apr · 1.1 19–22 Apr · 2.0 23–26 Apr · 3.0 27 Apr–1 May
  · open source: @alawys/sgp4-wasm (standalone); mcp-ar adds satellites (extension)
  · BACKGROUND → secondary: Stripe v2 v3.0 · Uber v2 v1.0–v3.0 · commercial: none
- CERT V5: AWS DVA (40 h) + Terraform Associate (22 h) · 2–9 May 2027 · 62 h
  · BACKGROUND → secondary: Uber v2 v3.0 · commercial: slot #6 (build + sell)
- JOB SEARCH E#5 · 10–15 May 2027 · 42 h
  · BACKGROUND → secondary: Uber v2 v3.0 · Notion v2 v1.0 · commercial: slot #6 (sell)
- PROJECT Constelación 2.0 + 2.1 · 16–21 May 2027 · 50 h
  · versions: 2.0 16–18 May · 2.1 19–21 May
  · open source: Alawys v2.0 (add agents / add mcp / @alawys/mcp, extension) + @alawys/ask-widget (standalone)
  · BACKGROUND → secondary: Notion v2 v1.0–v2.0 · commercial: none
PHASE 4 · DevSecOps / Platform
- PROJECT PetrIA Guard · 22 May–4 Jun 2027 · 130 h
  · 0.1 Arranque = Alawys + Go preset
  · versions: 1.0 22–25 May · 1.1 26–28 May · 2.0 29 May–1 Jun · 3.0 2–4 Jun
  · open source: @alawys/notify (extracted, origin PetrIA)
  · BACKGROUND → secondary: Notion v2 v2.0–v3.0 · commercial: none
- CERT V6: Security+ (75 h) + GitHub Advanced Security (18 h) · 5–16 Jun 2027 · 94 h
  · BACKGROUND → secondary: Notion v2 v3.0 · Spotify v2 v1.0 · commercial: slot #7 (build + sell)
- CERT V7: CKA (65 h) + OpenTelemetry Associate (17 h) · 17–26 Jun 2027 · 82 h
  · BACKGROUND → secondary: Spotify v2 v2.0–v3.0 · commercial: slot #8 (build + sell)
- CERT V8: AWS GenAI Developer Pro (62 h) + Claude Certified Developer (20 h) · 27 Jun–6 Jul 2027 · 82 h
  · BACKGROUND → secondary: Spotify v2 v3.0 · commercial: slot #9 (build + sell)
- JOB SEARCH E#6 · 7–11 Jul 2027 · 41 h
  · BACKGROUND → secondary: Spotify v2 v3.0 · Cursor v2 v1.0 · commercial: slot #9 (sell)
PHASE 5 · Computer Vision / MLOps
- MATH W2 · 12 Jul–5 Aug 2027 · 205 h
  · BACKGROUND → secondary: Cursor v2 v1.0–v3.0 · commercial: slot #10 (build + sell)
- PROJECT AeroScan · 6–19 Aug 2027 · 135 h
  · 0.1 Arranque = Alawys + Python ML preset
  · versions: 1.0 6–9 Aug · 1.1 10–12 Aug · 2.0 13–15 Aug · 3.0 16–19 Aug
  · open source: @alawys/llm-router (extracted, origin PetrIA)
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Multiplatform week · 20–22 Aug 2027 · 25 h
  · BACKGROUND → secondary: free · commercial: none
- PROJECT AgrIA Sat · 23 Aug–1 Sep 2027 · 100 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 23–24 Aug · 1.1 25–27 Aug · 2.0 28–30 Aug · 3.0 31 Aug–1 Sep
  · open source: @alawys/evals-action (extracted, origin PetrIA)
  · BACKGROUND → secondary: free · commercial: none
- JOB SEARCH short · 2–5 Sep 2027 · 32 h
  · BACKGROUND → secondary: free · commercial: slot #11 (build)
PHASE 6 · AI Security + Edge + SRE
- MATH W3 · 6–21 Sep 2027 · 144 h
  · BACKGROUND → secondary: free · commercial: slot #11 (build + sell)
- PROJECT AdversarIA · 22–30 Sep 2027 · 85 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 22–23 Sep · 1.1 24–25 Sep · 2.0 26–28 Sep · 3.0 29–30 Sep
  · open source: chatbot-scan (standalone)
  · BACKGROUND → secondary: free · commercial: none
- PROJECT AeroScan Edge · 1–13 Oct 2027 · 125 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 1–3 Oct · 1.1 4–6 Oct · 2.0 7–10 Oct · 3.0 11–13 Oct
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Antena Ops · 14–27 Oct 2027 · 135 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 14–17 Oct · 1.1 18–20 Oct · 2.0 21–23 Oct · 3.0 24–27 Oct
  · open source: @alawys/usage-meter (extracted, origin PetrIA)
  · BACKGROUND → secondary: free · commercial: none
- JOB SEARCH short · 28–31 Oct 2027 · 31 h
  · BACKGROUND → secondary: free · commercial: slot #12 (build)
- CONSOLIDATION (absorber) · 1–3 Nov 2027 · 3 days
  · BACKGROUND → secondary: free · commercial: slot #12 (build)

### STAGE 2 · CYBERSECURITY
PHASE 7 · Security Engineer
- MATH W4 · 4–9 Nov 2027 · 50 h
  · BACKGROUND → secondary: free · commercial: slot #13 (build)
- PROJECT Bóveda · 10–18 Nov 2027 · 85 h
  · 0.1 Arranque = Alawys + Rust/Go preset
  · versions: 1.0 10–11 Nov · 1.1 12–13 Nov · 2.0 14–16 Nov · 3.0 17–18 Nov
  · open source: @alawys/agent-creds + MCP (standalone)
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Asedio · 19–29 Nov 2027 · 105 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 19–21 Nov · 1.1 22–24 Nov · 2.0 25–26 Nov · 3.0 27–29 Nov
  · open source: Semgrep rules pack for LLM code (standalone)
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Vigía · 30 Nov–12 Dec 2027 · 125 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 30 Nov–2 Dec · 1.1 3–5 Dec · 2.0 6–9 Dec · 3.0 10–12 Dec
  · open source: Sigma + osquery pack (standalone)
  · BACKGROUND → secondary: free · commercial: none
- CERT PNPT · 13 Dec–13 Jan 2028 · 154 h · study 13–19 Dec and 27–30 Dec 2027; practical exam 7–11 Jan 2028 (5 days in a row); report 12–13 Jan; background paused
  · BACKGROUND → secondary: PAUSED · commercial: PAUSED
- JOB SEARCH E#7 · 14–18 Jan 2028 · 42 h
  · BACKGROUND → secondary: free · commercial: slot #14 (build)
- STAGE CLOSE (absorber) · 19–21 Jan 2028 · 3 days
  · BACKGROUND → secondary: free · commercial: slot #14 (build + sell)

### STAGE 3 · QUANT
PHASE 8 · Quant Developer
- MATH WQ1 · 22–30 Jan 2028 · 82 h
  · BACKGROUND → secondary: free · commercial: slot #15 (build + sell)
- PROJECT Alpha Lab · 31 Jan–12 Feb 2028 · 125 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 31 Jan–2 Feb · 1.1 3–5 Feb · 2.0 6–9 Feb · 3.0 10–12 Feb
  · open source: backtester crate + PyPI (standalone)
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Paper Trail · 13–23 Feb 2028 · 105 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 13–15 Feb · 1.1 16–18 Feb · 2.0 19–20 Feb · 3.0 21–23 Feb
  · BACKGROUND → secondary: free · commercial: none
- MATH WQ2 · 24 Feb–6 Mar 2028 · 104 h
  · BACKGROUND → secondary: free · commercial: slot #16 (build + sell)
- PROJECT Volta · 7–19 Mar 2028 · 130 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 7–9 Mar · 1.1 10–12 Mar · 2.0 13–16 Mar · 3.0 17–19 Mar
  · open source: opciones-ar PyPI + MCP (standalone)
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Matchbook · 20–30 Mar 2028 · 105 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 20–22 Mar · 1.1 23–25 Mar · 2.0 26–27 Mar · 3.0 28–30 Mar
  · BACKGROUND → secondary: free · commercial: none
- CERT CKS · 31 Mar–6 Apr 2028 · 62 h
  · BACKGROUND → secondary: free · commercial: slot #17 (build)
- JOB SEARCH E#8 · 7–11 Apr 2028 · 41 h
  · BACKGROUND → secondary: free · commercial: slot #17 (sell)
PHASE 9 · Quant Trading Engineer
- MATH WQ3 · 12–17 Apr 2028 · 51 h
  · BACKGROUND → secondary: free · commercial: slot #17 (sell)
- PROJECT Comando · 18 Apr–2 May 2028 · 150 h
  · 0.1 Arranque = Alawys + .NET + Rust preset
  · versions: 1.0 18–21 Apr · 1.1 22–25 Apr · 2.0 26–28 Apr · 3.0 29 Apr–2 May
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Ticker · 3–14 May 2028 · 120 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 3–5 May · 1.1 6–8 May · 2.0 9–11 May · 3.0 12–14 May
  · open source: mcp-ar v2: dollar MEP/CCL — LAUNCH with Imán gate
  · BACKGROUND → secondary: free · commercial: none
- CERT AWS Security Specialty · 15–23 May 2028 · 82 h
  · BACKGROUND → secondary: free · commercial: slot #18 (build + sell)
- JOB SEARCH E#9 · 24–28 May 2028 · 42 h
  · BACKGROUND → secondary: free · commercial: slot #18 (sell)
- STAGE CLOSE (absorber) · 29–31 May 2028 · 3 days
  · BACKGROUND → secondary: free · commercial: slot #18 (sell)

### STAGE 4 · AEROSPACE
PHASE 10 · Simulation / CAE
- MATH WA1 · 1–18 Jun 2028 · 103 h (rest 9–15 Jun inside)
  · BACKGROUND → secondary: free · commercial: slot #19 (build + sell)
- PROJECT Trayecta · 19 Jun–7 Jul 2028 · 185 h
  · 0.1 Arranque = Alawys + Julia preset
  · versions: 1.0 19–23 Jun · 1.1 24–28 Jun · 2.0 29 Jun–2 Jul · 3.0 3–7 Jul
  · BACKGROUND → secondary: free · commercial: none
- MATH WA2 · 8–16 Jul 2028 · 83 h
  · BACKGROUND → secondary: free · commercial: slot #20 (build + sell)
- PROJECT Malla · 17 Jul–3 Aug 2028 · 175 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 17–20 Jul · 1.1 21–25 Jul · 2.0 26–30 Jul · 3.0 31 Jul–3 Aug
  · open source: @alawys/fem-wasm (standalone)
  · BACKGROUND → secondary: free · commercial: none
- MATH WA3 · 4–15 Aug 2028 · 104 h
  · BACKGROUND → secondary: free · commercial: slot #21 (build + sell)
- PROJECT Viento · 16–30 Aug 2028 · 145 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 16–19 Aug · 1.1 20–23 Aug · 2.0 24–26 Aug · 3.0 27–30 Aug
  · BACKGROUND → secondary: free · commercial: none
- JOB SEARCH short · 31 Aug–3 Sep 2028 · 30 h
  · BACKGROUND → secondary: free · commercial: slot #22 (build)
PHASE 11 · GNC / Mission Software
- MATH WA4 · 4–12 Sep 2028 · 82 h
  · BACKGROUND → secondary: free · commercial: slot #22 (build + sell)
- PROJECT Piloto · 13 Sep–1 Oct 2028 · 190 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 13–17 Sep · 1.1 18–22 Sep · 2.0 23–26 Sep · 3.0 27 Sep–1 Oct
  · BACKGROUND → secondary: free · commercial: none
- CERT AWS SA Professional · 2–15 Oct 2028 · 124 h
  · BACKGROUND → secondary: free · commercial: slot #23 (build + sell)
- JOB SEARCH E#10 · 16–20 Oct 2028 · 40 h
  · BACKGROUND → secondary: free · commercial: slot #23 (sell)
- MATH WA5 · 21–26 Oct 2028 · 52 h
  · BACKGROUND → secondary: free · commercial: slot #23 (sell)
- PROJECT Órbita · 27 Oct–11 Nov 2028 · 155 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 27–30 Oct · 1.1 31 Oct–3 Nov · 2.0 4–7 Nov · 3.0 8–11 Nov
  · open source: mcp-ar adds conjunctions/reentries (extension)
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Upstream · 12–21 Nov 2028 · 100 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 12–14 Nov · 2.0 15–18 Nov · 3.0 19–21 Nov
  · BACKGROUND → secondary: free · commercial: none
- PROJECT Horizonte · 22 Nov–11 Dec 2028 · 200 h
  · 0.1 Arranque = generated with Alawys (existing preset)
  · versions: 1.0 22–26 Nov · 1.1 27 Nov–1 Dec · 2.0 2–6 Dec · 3.0 7–11 Dec
  · BACKGROUND → secondary: free · commercial: none
- CLOSE & RENEWALS (absorber) · 12–14 Dec 2028 · 3 days
  · BACKGROUND → secondary: free · commercial: none

Expected plan end: 14 Dec 2028 (an estimate, not a deadline).

## 5. SECONDARY APPS (10)
1. JulIA · 26 Nov–16 Dec 2026 · v1.0 26 Nov–2 Dec (courses, Remotion lessons, Claude tutor) · v2.0 3–9 Dec (3D simulations, BKT, FSRS) [review: personal data] · v3.0 10–16 Dec (neural vs BKT, EAS certificates on testnet, B2B panel) [review: smart contracts] · targets Udemy, Platzi, Coursera · tool bkt.
2. HandyX · 17 Dec 2026–6 Jan 2027 · generated with Alawys · v1.0 17–23 Dec (web + app, request, chat, Mercado Pago escrow sandbox) [review: money] · v2.0 24–30 Dec (Claude vision quote, voice agent, scheduling) · v3.0 31 Dec–6 Jan (learning-to-rank, .NET payments service, USDC testnet, hardening) [review: money, security, smart contracts] · targets Uber, PedidosYa, Rappi.
3. Clip Studio · 7–27 Jan 2027 · v1.0 7–13 Jan (ingest, Whisper, highlights, FFmpeg cuts) · v2.0 14–20 Jan (reframe, captions, Claude hooks, chat peaks) · v3.0 21–27 Jan (retention model reusing HandyX ranking, trends, scheduling via official APIs) · targets Opus Clip, Descript, CapCut, YouTube, Kick, Twitch.
4. Roofy · 28 Jan–17 Feb 2027 · v1.0 28 Jan–3 Feb (listings + 3D tour) · v2.0 4–10 Feb (WebXR AR + visit-booking agent) [review: personal data] · v3.0 11–17 Feb (plans, metrics, hardening) [review: money, security] · targets Zonaprop, Roomix.
Heavy "v2" apps, 4 weeks each (v1.0 week 1 · v2.0 week 2 · v3.0 weeks 3–4 with scale, hardening and Imán):
5. Amazon v2 · 18 Feb–17 Mar 2027 · v1.0 18–24 Feb (catalog, hybrid search, cart, checkout) · v2.0 25 Feb–3 Mar (recommendations, shopping agent that never pays without confirmation) · v3.0 4–17 Mar (simulated Black Friday, caching, search evals) [review: payments, personal data] · targets Amazon, Mercado Libre, Shopify · stack Next.js, NestJS per domain, Postgres FTS + pgvector, Redis, LightGBM, Claude agent.
6. Stripe v2 · 18 Mar–14 Apr · v1.0 18–24 Mar (charges, double-entry ledger, idempotency) · v2.0 25–31 Mar (signed webhooks, refunds, disputes, ML anti-fraud) · v3.0 1–14 Apr (reconciliation, chaos, USDC testnet) [review: money, security, smart contracts — every version] · targets Stripe, Mercado Pago, Ualá, Nubank, dLocal · stack .NET (reuse HandyX) or Go, append-only Postgres, HMAC, LightGBM + rules.
7. Uber v2 (realtime mobility) · 15 Apr–12 May · v1.0 15–21 Apr (request, dispatch, live tracking) · v2.0 22–28 Apr (surge pricing, ML ETA) · v3.0 29 Apr–12 May (10k simulated drivers, p99, network failures) [review: personal data/location] · targets Uber, Cabify, DiDi, Rappi, PedidosYa · stack Go or Rust, Redis geo, websockets, H3, Kafka, MapLibre, Expo.
8. Notion v2 · 13 May–9 Jun · v1.0 13–19 May (block editor, live collaboration, presence) · v2.0 20–26 May (offline, permissions, writing agent) · v3.0 27 May–9 Jun (RAG with permissions, 100 concurrent editors) [review: personal data, permissions] · targets Notion, Linear, Figma, Atlassian, Canva · stack Next.js, Yjs, websockets, Redis pub/sub, Postgres + pgvector.
9. Spotify v2 · 10 Jun–7 Jul · v1.0 10–16 Jun (catalog, HLS streaming, playlists) · v2.0 17–23 Jun (audio-embedding recommendations, generated radio) · v3.0 24 Jun–7 Jul (podcast summaries with voice, offline evals) · targets Spotify, Deezer, SoundCloud · rule: open-licence or permitted audio only.
10. Cursor v2 · 8 Jul–4 Aug · v1.0 8–14 Jul (read repo, plan, edit, diff) · v2.0 15–21 Jul (sandboxed tests, automatic PR) · v3.0 22 Jul–4 Aug (SWE-bench-lite evals with success rate, MCP) [review: security — isolated execution, no secrets] · targets Anthropic, Cursor, GitHub, Vercel, Replit · stack TypeScript CLI + web, Claude tools + MCP, no-network containers, @alawys/evals-action.
- From 5 Aug 2027 the secondary track is FREE.
- "Ver a futuro" backlog (no dates): Agentes para pymes, Finanzas personales Argentina, Copiloto de búsqueda laboral, Trazo Pro, Consorcios/expensas, Coach de entrenamiento.

## 6. COMMERCIAL SLOTS (23)
Status pipeline per slot: planned → building → review → published → pitched; leads per slot. Brand stays editable.
- #1 · 13–27 Dec 2026 · host: Cert V1 + English E#1 · build 13–19 Dec · sell 20–27 Dec · Aquasol and water parks · builds: new premium web, 3D park, live lines and weather (simulated), demo tickets, AR · wow: fly over the park · reuses: PetrIA Three.js; first project generated with Alawys
- #2 · 9–27 Jan 2027 · host: Cert V2 + English E#2 · build 9–15 Jan · sell 16–27 Jan · Cinemacenter · builds: listings, 3D seat picker, Claude recommender · wow: see the screen from your seat · reuses: PetrIA agent · tool: @alawys/showcase-kit (extracted: Aquasol → Cinemacenter)
- #3 · 28 Jan–21 Feb 2027 · host: Math W1 · build 28 Jan–3 Feb · sell 4–21 Feb · miboletería · builds: ticketing with 3D stadium, virtual queue, alerts · wow: queue survives a simulated spike (no real LLM) · reuses: PetrIA queues (RabbitMQ) · tool: @alawys/seat-picker (extracted)
- #4 · 22 Feb–12 Mar 2027 · host: Cert V3 + English E#3 · build 22–28 Feb · sell 1–12 Mar · McDonald's · builds: voice ordering, 3D menu, Lucero-style games · wow: build the combo by talking · reuses: PetrIA voice-gateway · tool: @alawys/voice-agent (extracted: origin PetrIA voice-gateway)
- #5 · 26 Mar–13 Apr 2027 · host: Cert V4 + English E#4 + Cambridge C1 · build 26 Mar–1 Apr · sell 2–13 Apr · Supermarkets · builds: smart list, recipes from what you have, simulated-price comparator · wow: fridge photo → list · reuses: PetrIA daily-report vision
- #6 · 2–15 May 2027 · host: Cert V5 + Job search E#5 · build 2–8 May · sell 9–15 May · SportClub and gyms · builds: member app, classes, AI coach, occupancy per branch (simulated) · wow: which branch is empty now · reuses: Antena realtime
- #7 · 5–16 Jun 2027 · host: Cert V6 · build 5–11 Jun · sell 12–16 Jun · Car dealerships · builds: 3D configurator, test-drive agent, financing simulator · wow: spin the car and change its color · reuses: JulIA R3F
- #8 · 17–26 Jun 2027 · host: Cert V7 · build 17–23 Jun · sell 24–26 Jun · Balnearios · builds: tent booking on a 3D beach map, weather and tides · wow: pick your tent on the map · reuses: Aquasol map
- #9 · 27 Jun–11 Jul 2027 · host: Cert V8 + Job search E#6 · build 27 Jun–3 Jul · sell 4–11 Jul · Theaters / season · builds: season listings, 3D seats, play recommender · wow: walk the room before buying · reuses: @alawys/seat-picker
- #10 · 12 Jul–5 Aug 2027 · host: Math W2 · build 12–18 Jul · sell 19 Jul–5 Aug · Pharmacies · builds: stock per branch (simulated), reminders, assistant that never diagnoses · wow: nearest branch with the medicine · reuses: VitalIA rules
- #11 · 2–21 Sep 2027 · host: Job search short + Math W3 · build 2–8 Sep · sell 9–21 Sep · Airbnb v2 · builds: stays with 3D/AR tour, booking agent · wow: stand in the living room before booking · reuses: Roofy AR · tool: @alawys/tour3d (extracted: Roofy → Airbnb v2)
- #12 · 28 Oct–3 Nov 2027 · host: Job search short + Consolidation · build only · Football clubs · builds: member app, digital card, 3D stadium, clips, no real crests · wow: Sunday goal already vertical · reuses: Clip Studio, seat-picker
- #13 · 4–9 Nov 2027 · host: Math W4 · build only · Hotels and tourism · builds: landing, 3D tour, multilingual concierge · wow: ask the hotel in your language · reuses: Airbnb v2
- #14 · 14–21 Jan 2028 · host: Job search E#7 + Stage close · build 14–20 Jan · sell 21 Jan · Restaurants and breweries · builds: 3D menu, QR + voice ordering, booking agent · wow: order the pint by talking · reuses: @alawys/voice-agent
- #15 · 22–30 Jan 2028 · host: Math WQ1 · build 22–28 Jan · sell 29–30 Jan · Universities and institutes · builds: campus 3D, guided enrollment, careers/scholarships assistant · wow: "Which career fits me?" → a plan · reuses: JulIA, Constelación RAG
- #16 · 24 Feb–6 Mar 2028 · host: Math WQ2 · build 24 Feb–1 Mar · sell 2–6 Mar · Schools · builds: family app: notices, fees, report cards, parent assistant on WhatsApp · wow: "Does my kid have homework tomorrow?" · reuses: @alawys/notify, JulIA
- #17 · 31 Mar–17 Apr 2028 · host: Cert CKS + Job search E#8 + Math WQ3 · build 31 Mar–6 Apr · sell 7–17 Apr · Insurance · builds: 1-minute quote, claim with damage photos · wow: photos of the crash → estimate · reuses: AeroScan vision, Stripe v2 ledger · foreground review: personal data
- #18 · 15–31 May 2028 · host: Cert AWS Security Specialty + Job search E#9 + Stage close · build 15–21 May · sell 22–31 May · Fuel stations · builds: loyalty app, pay at the pump, price map, store · wow: pay without leaving the car · reuses: Stripe v2 payments, PetrIA map
- #19 · 1–18 Jun 2028 · host: Math WA1 · build 1–7 Jun · sell 8–18 Jun (rest 9–15 Jun inside) · Fashion retail · builds: AR try-on, size from a photo, style agent · wow: see the jacket on you before buying · reuses: Roofy AR, Amazon v2
- #20 · 8–16 Jul 2028 · host: Math WA2 · build 8–14 Jul · sell 15–16 Jul · Airlines and travel · builds: check-in, AR baggage, agent that rebooks cancelled flights · wow: "Your flight was cancelled: 3 options" · reuses: PetrIA voice, AR
- #21 · 4–15 Aug 2028 · host: Math WA3 · build 4–10 Aug · sell 11–15 Aug · Wineries · builds: 3D vineyard tour, AI pairing, store and wine club · wow: "BBQ and 15k pesos" → a basket · reuses: Amazon v2, tour3d
- #22 · 31 Aug–12 Sep 2028 · host: Job search short + Math WA4 · build 31 Aug–6 Sep · sell 7–12 Sep · Logistics and delivery · builds: live tracking, reschedule delivery, route optimization · wow: the parcel moving on the map with real ETA · reuses: Uber v2 dispatch
- #23 · 2–26 Oct 2028 · host: Cert AWS SA Professional + Job search E#10 + Math WA5 · build 2–8 Oct · sell 9–26 Oct · Private clinics · builds: online booking, reminders, triage that never diagnoses and refers; no real clinical data · wow: book in 30 s on WhatsApp · reuses: VitalIA rules, @alawys/notify · foreground review: personal data
- Alternatives list for any slot: real estate (Mar del Plata), vets and pet shops, hair and beauty salons, developers with off-plan apartments, agro cooperatives, coastal seasonal tourism.

## 7. Reminders (one-off; replace older background reminders)
- 26 Nov 2026: start JulIA v1.0 in the background (separate repo).
- 3 Dec 2026: Aquasol brief for slot #1.
- 5 Dec 2026: PC arrives → start Alawys v0.1 (1 h/day from PetrIA until 11 Dec).
- 7 days before every slot: brief (hook, wow, reuse). 14 days before every slot: brand pick (regional vs big).
- Secondary handovers: 16 Dec, 6 Jan, 27 Jan, 17 Feb, 17 Mar, 14 Apr, 12 May, 9 Jun, 7 Jul, 4 Aug 2027. 28 Jul 2027: decide whether to open a new secondary after 4 Aug.
- 13 Dec 2026: after 3 weeks of JulIA, ask me whether 1 h/day of review is enough. Same day: re-check the plan with real data (3 weeks in).
- Bookings: Claude Architect + GitHub Foundations for 13–18 Dec (keep any booking I already made); AI-103 before 26 Dec; Cambridge C1 before 25 Jan 2027; every other exam on the day the previous project starts.
- PNPT: book the 5-day practical exam window for 7–11 Jan 2028.

## 8. Views (changes only)
1. Today: "In background" strip shows the active secondary app + version, the active slot + phase (build/sell), and today's review hours. Delay alert when the principal track is more than 7 days behind.
2. Timeline: three lanes (principal, secondary, commercial) + tool markers on the principal lane; fixed days off shaded.
3. Commercial page: pipeline + leads; slot cards show build and sell sub-periods.
4. Open source page (section 3).
5. Sunday review additions (section 1) and the delay alert.
