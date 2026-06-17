# AGENTS.md

## What lives here
This repository is built and maintained with the help of AI coding agents.

## Models in use
- Gemini (cloud) — used for content generation, brainstorming.
- Gemma 4 2B via Ollama or LM Studio (local) — used for offline work and code review.

## Responsible AI rules
- Every model output is reviewed by a human before it is merged.
- No personal data, credentials, or proprietary code is sent to a public model.
- AI assistance is disclosed in PR descriptions and in the README footer.
- Known limitations: small local models may hallucinate citations; we verify every citation against the source PDF.
- High-risk changes (auth, payments, student records) require a second human reviewer.

## Escalation
If a model produces something that looks wrong, stop and ask a human.

---

## Agent Instructions & Onboarding

Welcome, AI Agent! To ensure smooth integration and successful execution of tasks in this repository, please adhere to the following guidelines and workflow.

### 1. Project Overview & Tech Stack
- **Frontend Framework:** React 19 (located in [src/](file:///d:/dict/Calvo/Neural-Run-V1.0/src/))
- **Build Tool / Bundler:** Vite (configured via [vite.config.ts](file:///d:/dict/Calvo/Neural-Run-V1.0/vite.config.ts))
- **Styling:** Tailwind CSS v4
- **Animation:** Motion (`motion`)
- **Backend / Mock Server:** Express
- **Package Manager:** npm

### 2. Available Commands
When working on code modification, verification, or local execution, use the following commands:
- **Install Dependencies:** `npm install`
- **Development Server:** `npm run dev` (starts on port `3000`, host `0.0.0.0`)
- **Production Build:** `npm run build`
- **Preview Build:** `npm run preview`
- **Type Checking / Linting:** `npm run lint`
- **Clean Build Artifacts:** `npm run clean`

### 3. Task Management (`TASKS.md`)
You must track your progress and manage the task list inside [TASKS.md](file:///d:/dict/Calvo/Neural-Run-V1.0/TASKS.md).
- Prior to starting any task, read [TASKS.md](file:///d:/dict/Calvo/Neural-Run-V1.0/TASKS.md) to understand the current priority queue.
- Keep the task statuses updated using the appropriate markdown checkboxes:
  - `[ ]` for uncompleted tasks
  - `[x]` for completed tasks
- Format task entries under the appropriate sections: `## Now (today)`, `## Next`, `## Backlog`, or `## Done`.

### 4. Prompt Engineering History (`PROMPTS.md`)
Keep track of effective and ineffective prompts in [PROMPTS.md](file:///d:/dict/Calvo/Neural-Run-V1.0/PROMPTS.md).
- When you use a complex prompt that yields great output (5/5), log it under a new section.
- If a prompt performs poorly, record the details and note the limitations to help future agents avoid the same issues.

### 5. Coding & Contribution Rules
- **TypeScript Strictness:** Always maintain clean, error-free TypeScript code. Run `npm run lint` before finishing a task to verify there are no compilation errors.
- **Maintain Comments:** Preserve all existing comments and documentation that are unrelated to your edits unless explicitly instructed to modify them.
- **Path Schemes:** Always use absolute paths with `file:///` URI scheme for links in artifacts and communication.
