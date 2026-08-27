# SHRAVANA PORTAL

SHRAVANA PORTAL is a hackathon MVP for citizen grievance accountability. It makes citizen-confirmed outcomes—not a department response—the basis for closure.

## Architecture

The application has a React + TypeScript frontend, a Node HTTP API in `server/index.mjs`, and a local SQLite database at `data/shravana.db`. Domain rules live in `src/domain`, workflow-facing services in `src/services`, and presentation in `src/app`.

The next backend should expose API modules for intake, routing, evidence, SLA, responses, outcomes, escalation, analytics, and audit logging. Keep any AI provider behind an adapter that returns structured classification/extraction results; deterministic routing rules remain authoritative.

## Demo boundaries

All dashboard metrics, grievances, SLA events, and escalation actions are simulated. SHRAVANA PORTAL does not connect to CPGRAMS or perform real government escalation.

## Commands

`npm run dev` starts both the local API (port 3001) and web app (normally port 5173). `npm run build`, `npm run lint`, and `npm run test` validate it.

Grievances, citizen outcomes, escalation events, audit events, and evidence metadata are stored in SQLite. Image files are stored locally in `data/uploads/`.
