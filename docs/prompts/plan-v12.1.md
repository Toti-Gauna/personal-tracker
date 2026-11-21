# Trazo · Plan v12.1 (21 Nov 2026) — source of truth

> Prompt received on 21 Nov 2026 (replaces roadmap v7, archived in `data/archivo/roadmap-v7/`). Followed by Ignacio's answers to the
> mapping questions. Generated data: `scripts/plan-v12.mjs` → `data/plan-extendido.json` and `data/proyectos-v7.json` (versions).

## Answers to the mapping questions (21 Nov 2026)

1. PetrIA batches: full list below (wave 0 counts toward 1.0). Stated total 194.5 h; the batches add up to 193.5 h (flagged, not fixed).
2. Hours logged on 19–20 Nov go to "PetrIA v0 (archived)"; they don't count toward v12.1 PetrIA.
3. Weekend: 10:00–13:30 build, 13:30–15:45 close-out (same sequence and durations as weekdays), 15:45–17:00 Saturday demo + mock interview / Sunday weekly review.
4. Phases: derive the missing ones from their blocks, mark "to confirm"; exits for P3 and P5–P11 as listed below.
5. Weights: versions by days, certs by study hours, math milestones by days, batches by hours, English and job-search weeks by days.
6. Archive what's loaded as "roadmap v7 (archived, 20 Nov 2026)"; keep progress matched by block id.
7. Daily math tracks m1–m4: archived (keep chapter progress). With-job routine: archived. 6-year language plan: archived (English Made Simple, English Pronunciation Course and Cambridge C1 continue). Handyx, clipping, Eclipse: paused, hidden from Today and Goals, data kept.
8. Math: W1/W2 Conamat milestones map onto the Conamat books Trazo already has; each milestone is attached to a chapter range.
9. Renewals: each vendor's usual validity, marked "to verify". Cambridge C1 has no expiry.

Phase exits given: P3 Antena + Constelación 2.1 live, AWS Developer + Terraform passed, 15+ applications (going to market with + Antena, Constelación 2.1, AWS Developer, Terraform) · P5 W2 milestones, AeroScan + Multiplatform + AgrIA Sat live, 4 papers with thesis, 10+ applications (+ AeroScan, AgrIA Sat) · P6 W3 milestones incl. mini-GPT, AdversarIA + AeroScan Edge + Antena Ops live, 4 papers, 10+ applications · P7 W4, Bóveda + Asedio + Vigía live, PNPT passed · P8 WQ1 + WQ2, Alpha Lab + Paper Trail + Volta + Matchbook live, CKS passed · P9 WQ3, Comando + Ticker live, AWS Security Specialty passed · P10 WA1–WA3, Trayecta + Malla + Viento live · P11 WA4 + WA5, Piloto + Órbita + Upstream + Horizonte live, AWS SA Pro passed.

PetrIA batches (id · version · name · hours · estimated · deadline · model): 0.0 pre-1.0 Onboarding 1.5 21/11 21/11 Opus high · 0.1 pre-1.0 Repos, CI & Docker 3 21/11 21/11 Sonnet medium · 0.2 pre-1.0 Database & roles 2.5 21/11 21/11 Opus high · 1.1 1.0 Ingest & cleaning 7 22/11 23/11 Opus xhigh · 1.2 1.0 Messaging & concessions 3 22/11 23/11 Sonnet high · 1.3 1.0 Features & baseline 6 23/11 24/11 Opus xhigh · 1.4 1.0 P10/P50/P90 detector 7 23/11 26/11 Opus xhigh · 1.5 1.0 Read API 4 24/11 27/11 Opus high · 1.6 1.0 Map 5 24/11 28/11 Fable xhigh · 1.7 1.0 Assistant with citations 6 25/11 30/11 Opus xhigh · 1.8 1.0 Production 1.0 + release 2 25/11 01/12 Sonnet high · 2.1 1.1 Well value & decline 7 26/11 03/12 Opus high · 2.2 1.1 Daily-report reader 7 26/11 05/12 Opus high · 2.3 1.1 Login & companies 8 27/11 07/12 Opus xhigh · 2.4 1.1 Serious AI + feedback loop 8.5 28/11 08/12 Opus high · 2.5 1.1 Quality 6 29/11 09/12 Sonnet high · 2.6 1.1 Observability, evals in CI & security 8 29/11 11/12 Opus high · 2.7 1.1 1.1 screens + release 4 30/11 12/12 Fable high · 3.1 2.0 notification-service 8 30/11 14/12 Opus high · 3.2 2.0 Real channels 9 01/12 16/12 Opus high · 3.3 2.0 voice-gateway 10 02/12 19/12 Opus xhigh · 3.4 2.0 Usage & quotas 6 03/12 20/12 Sonnet high · 3.5 2.0 Design system + 2.0 release 7 04/12 22/12 Fable high · 4.1 3.0 load-lab 14 05/12 25/12 Opus high · 4.2 3.0 Operations 12 06/12 28/12 Opus high · 4.3 3.0 Ingest on AWS 10 07/12 30/12 Opus high · 4.4 3.0 Physical layer 14 08/12 03/01 Fable high · 4.5 3.0 Scale report + 3.0 release 8 09/12 05/01 Sonnet medium.

## The prompt (as received)

The full prompt "TRAZO — FULL PLAN UPDATE v12.1" (sections 1 to 7: structure, goals as periods, study method, routine,
reminders, v12.1 data and views) is transcribed into `scripts/plan-v12.mjs` (data) and summarized in `docs/PLAN.md` (§ v12.1).
Key rules: never delete progress; don't touch the P0 goals; dates in America/Argentina/Buenos_Aires; goals are periods (time vs
work bars, state, drill-down); habits separate from goals; late blocks get a suggested shift that is never applied without
confirmation; fixed dates: the pause 20–26 Dec 2027 and booked exam dates.
