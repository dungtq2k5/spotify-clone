# Course Requirements (NestJS track)

English summary of the parts of the course PDFs that apply to this project
(*Danh mục công nghệ và yêu cầu học tập* · Các Công nghệ Lập trình Hiện đại · 09/2026).
Source screenshots: `docs/archive/imgs/`.

## Three-tier model

| Tier | What | Rule |
| --- | --- | --- |
| 1 — Technology essence | Mechanisms that make NestJS different (Part F) | **1A core is mandatory**; 1B picked by need |
| 2 — Software engineering | Versioning, testing, security, reproducibility, docs (Part D) | Mandatory |
| 3 — Advanced | Cross-cutting upgrades | Optional; only counts with numbers / evidence |

> The business problem only needs to be simple enough for the technology to show.
> Points come from understanding, using correctly and going deep into the technology — not from building a large "real" system.

## Tier 1A — mandatory core (NestJS)

- **Module**: know which module a feature belongs to, how providers are imported/exported.
- **Controller**: route/HTTP method, receive input, delegate to service/provider.
- **Provider + Dependency Injection**: inject via constructor; understand why we never `new` a service by hand.
- Minimum request flow: controller → provider/service → data source, with clear error responses.

## Tier 1B — pick by need (must understand the mechanism of every one picked)

- DTO + `ValidationPipe` to normalise/validate input.
- Guard for authentication/authorization.
- Interceptor for logging / transform / cache / timing.
- Exception Filter for centralised errors.
- Custom decorator for user / role / metadata.
- Dynamic module / config module when configuration is needed.
- ORM / query layer and transactions when using a DB.

### Minimum evidence

- Module diagram or request-flow diagram for one real endpoint.
- Point to at least one injected dependency and its lifecycle.
- If Guard/Pipe/Interceptor/Filter are used: sample requests showing before/after behaviour at runtime.

### Not passing if

- Only controller + CRUD service, can't explain module/DI.
- `new`-ing services/repositories inside controllers.
- Permission checks via `if/else` in every controller while claiming to have learnt Guards.

### Self-check questions

- "What is the difference between a Guard and an Interceptor, and why put permission checks in a Guard?"
- "When is a provider created / in which scope?"
- "Where is bad input stopped before it reaches business logic?"

### Live-exam style tasks (only on the submitted project)

- Add a Guard / role rule to an existing module.
- Write a Pipe or DTO validation for a new field.
- Add an Interceptor that measures time / normalises responses, if the project uses that pattern.

## Tier 2 — software engineering (code projects)

| Goal | Requirement |
| --- | --- |
| Version control | Git: branches, pull requests, cross review, conflict handling. No direct commits to main. |
| Reproducibility | Docker + docker compose; one-command run; seed data; test accounts. |
| Secrets | Env vars or secret store; never commit API keys. |
| Testing | Unit tests, API tests, or an end-to-end flow. |
| CI | GitHub Actions runs build + tests on every push. |
| Security | OWASP Top 10 awareness; hash passwords; prevent SQL injection & XSS; correct CORS. |
| Docs | README that actually runs; auto-generated API docs. |
| Working with AI | Use AI for tests/explanations/review but verify; honest **AI Disclosure** section. |

Must read and cite official documentation of the chosen technology.

## Tier 3 — optional (Backend & API), only with evidence/metrics

- **Cache & query optimisation**: Redis/Valkey, TTL/invalidation, DB indexes, cursor pagination — with before/after latency / query counts.
- **Observability**: structured logs, trace/request id, metrics/health; can trace a failing request across layers.
- (Out of scope for us: queues, realtime, full-text search, payments/webhooks, streaming, microservices.)

## Things to avoid

- Too thin: only calling one endpoint, static CRUD.
- Too wide for 12 weeks: microservices, k8s, etc.
- External dependencies out of our control → need mock/stub from week 2.

## Pre-submission checklist

1. Correct main technology in title and report; not only the business name.
2. Mark every 1A item done, with the file/module/route that shows it.
3. List 1B items used and why; name the ones not chosen.
4. List Tier 2 items done with evidence (CI, test, repo…).
5. List Tier 3 items, each with numbers, test cases or proof.
6. Report tech table must match code; no technique that only exists in slides/demo.
7. Every member can open any code and explain / change it live without AI.
8. If business logic eats the time, simplify the business, not the technology.
