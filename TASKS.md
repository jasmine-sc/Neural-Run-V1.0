# TASKS.md

> Backlog for the AI agent and the team. Pick the top 3 every morning.

## Now (today)

## Next
- [ ] TASK-010 — Validate webcam feed + prediction loop end-to-end in production (Vercel) — Agent — test after next deploy
- [ ] TASK-011 — Add dark-mode toggle to TMController panel — Agent — toggle persists in localStorage
- [ ] TASK-012 — Add `useWebcam` custom hook to extract webcam lifecycle from TMController — Agent — hook covers setup/start/stop/cleanup

## Backlog
- [ ] TASK-020 — Write unit tests for evaluatePredictions mapping logic — Agent
- [ ] TASK-021 — Add confidence history chart (sparkline) for last 30 frames — Agent
- [ ] TASK-022 — Add support for pose model type in addition to image model — Agent

## Done
- [x] TASK-000 — Project scaffold and Vite/React setup — finished 2026-06-17
- [x] TASK-004 — Implement local Teachable Machine model with happy/sad labels to control runner — Antigravity — finished 2026-06-17
- [x] TASK-005 — Fix Vercel build: remove conflicting @teachablemachine/image + @tensorflow/tfjs npm packages; switch to CDN injection — Antigravity — finished 2026-06-17
- [x] TASK-006 — Add .npmrc with legacy-peer-deps=true for Vercel safety net — Antigravity — finished 2026-06-17
- [x] TASK-007 — Fix duplicate vite entry in package.json dependencies — Antigravity — finished 2026-06-17
- [x] TASK-008 — Restore CDN script injection for TF.js + TM Image in TMController.tsx — Antigravity — finished 2026-06-17
- [x] TASK-009 — Rewrite webcam to use getUserMedia + video element (direct feed) — Antigravity — finished 2026-06-17
