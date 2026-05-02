# Facebook-Style Social Network — PostgreSQL Edition

## What This Is

A web-based, PostgreSQL-backed reimplementation of the existing console + Swing Java social network in `DB_project/`, built as a solo university DB course final. It preserves every feature of the reference app — accounts, friends, posts, feed, messaging, notifications, online presence, and three mini-games — but replaces the file-on-Google-Drive persistence with a properly designed relational database accessed via JDBC from a Spring Boot + Thymeleaf web UI. Both source code and a written report are deliverables.

## Core Value

**The PostgreSQL schema and the SQL that runs against it.** The web UI exists to exercise the database. If anything has to give, it's polish — not the schema, not the queries, not the report.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Accounts & profile**
- [ ] User can sign up with email + password (BCrypt-hashed)
- [ ] User can log in / log out and stay logged in across sessions
- [ ] User can reset their password
- [ ] User can edit profile fields (name, gender, etc.)
- [ ] User can toggle privacy mode (hides online presence)

**Friends graph**
- [ ] User can search for other users by name
- [ ] User can send / cancel a friend request
- [ ] User can accept / reject / delete an incoming friend request
- [ ] User can view their friend list and a friend's mutual friends
- [ ] User can see friend suggestions derived from mutual-friends + BFS over the friend graph

**Posts, likes, comments**
- [ ] User can create a text post and tag friends
- [ ] User can like / unlike a post
- [ ] User can comment on a post; users can reply / view comment threads
- [ ] User can view a post's full detail (likes, comments, tagged users)

**Feed & visibility**
- [ ] User has a personalized feed with refresh
- [ ] Posts honor visibility scopes: friends-only, friends-of-friends (depth 2), public (depth 6)

**Messaging**
- [ ] User can send 1:1 direct messages
- [ ] User can create group chats and manage members (add/remove)
- [ ] Inbox lists chats with last-message preview

**Notifications**
- [ ] User receives notifications for: messages, likes, comments, tags, friend requests
- [ ] Notifications track read / unread state

**Presence**
- [ ] Online status is recorded on login and removed on logout (subject to privacy toggle)

**Games**
- [ ] Hangman — single-player local + vs computer, playable in-browser
- [ ] Snake — single-player canvas game with persistent per-user high score
- [ ] Online Tic Tac Toe — invite flow, accept/reject, persistent match state, scoreboard

**Web platform**
- [ ] Spring Boot + Thymeleaf + Spring Security web app replaces the original console + Swing UI
- [ ] AJAX polling delivers near-realtime updates for chat, notifications, online presence, and online TTT

**Database (the deliverable)**
- [ ] PostgreSQL schema normalized to 3NF with foreign-key constraints, appropriate indexes, and transaction boundaries on multi-write operations (e.g. accept-friend-request, send-message)
- [ ] SQL showcase: at least one recursive CTE (friend-graph BFS), window functions (leaderboards, feed ranking), non-trivial joins/aggregates
- [ ] Stored procedures, triggers, and views — each used at least once where they earn their place (not for show)
- [ ] Performance pass: EXPLAIN plans for the heaviest queries, index choices justified

**Report**
- [ ] Final report covers: ERD, normalization steps, schema rationale, SQL showcase queries with explanations, DB-feature tour (procs/triggers/views), and performance/index analysis

### Out of Scope

- **Console / Swing UIs** — replaced by the web UI; maintaining two front-ends is wasted effort in a 2–4 week solo window
- **WebSockets / push-based realtime** — polling is sufficient for chat / notifications / online TTT and avoids a second protocol stack
- **SPA frameworks (React / Vue / etc.)** — Thymeleaf server-rendering is simpler given "new to Java web dev"
- **Mobile / native clients** — outside a DB course's remit
- **File-based persistence on Google Drive** — the entire reason this project exists
- **Full ORM (Hibernate / JPA) over the showcase queries** — would hide the SQL the report needs to demonstrate; JPA is allowed only for trivial CRUD plumbing
- **Production deployment / public hosting** — local Postgres + local Spring Boot for the demo
- **OAuth, 2FA, magic links, third-party identity** — form login + BCrypt is enough for an academic demo
- **Migrations from the existing file-based DB** — schema is built fresh; the file-tree is reference only

## Context

- **Reference codebase:** `DB_project/` is a Java console + Swing app where data is `ObjectOutputStream`-serialized into a folder tree on `G:\Shared drives\Facebook\Database`. Its `summary.txt` is effectively a draft ERD: it documents the data model, feature flow, and storage layout used today.
- **Class shape maps to tables:** Existing classes (`User`, `Credentials`, `Post`, `Comment`, `Chat`, `DM_chat`, `Group_chat`, `Message`, `Notification`, `Game_Invite`, `TicTacToe`, `Scoreboard`, etc.) translate cleanly onto relational tables. The schema work is largely making this implicit model explicit and enforcing it with constraints.
- **Developer profile:** Solo, comfortable with Java, new to Java web frameworks. Stack choices favor the simplest viable Java web stack.
- **Deliverables:** Working application + written report. The course expects both.
- **No formal rubric:** Assume standard DB-course expectations — ERD, 3NF normalization, DDL + DML, non-trivial SQL queries, stored procedures / triggers / views, plus a performance / index discussion.

## Constraints

- **Timeline**: 2–4 weeks, solo. Scope must hold; ornamental work is the first thing cut.
- **DBMS**: PostgreSQL. Chosen for recursive CTEs, window functions, and richer feature set — directly serves the SQL-showcase report angle.
- **Backend**: Java + Spring Boot 3, Spring Web, Spring Security (form login + BCrypt). JDBC via `JdbcTemplate` is the primary data-access path; Spring Data JPA is permitted only for trivial CRUD where it saves time without hiding the query plan.
- **Frontend**: Thymeleaf server-rendered HTML. Vanilla JS + HTML5 Canvas for the games. No SPA framework, no build pipeline beyond Maven/Gradle.
- **Realtime**: AJAX polling only — no WebSockets, no Server-Sent Events.
- **Auth**: Email + password, BCrypt-hashed. No third-party identity, no 2FA.
- **Persistence**: All durable state in PostgreSQL. No file-based persistence in the new app.
- **Skill ceiling**: New to Java web — avoid stacks with a steep learning curve (Reactive WebFlux, GraphQL, microservices, etc.).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Refactor in place (vs. rewrite from scratch or port to another language) | `DB_project/` already implements all features; effort goes into schema + SQL, not recreating UI logic | — Pending |
| PostgreSQL over MySQL | Recursive CTEs + window functions + JSONB give more material for the SQL-showcase report angle | — Pending |
| Spring Boot + Thymeleaf + Spring Security | Simplest Java web stack for "new to Java web" — server-rendered, no SPA learning curve | — Pending |
| `JdbcTemplate` primary; JPA only for trivial CRUD | DB course is graded on the SQL — JPA over showcase queries would hide what the report must demonstrate | — Pending |
| Drop console + Swing UIs entirely | One UI to maintain in a 2–4 week solo window; web is more impressive at demo time | — Pending |
| Polling over WebSockets | Tight deadline + new to Java web; polling is good enough for chat / notifications / online TTT and is schema-friendly | — Pending |
| Keep all three games (Hangman, Snake, online TTT) | Explicit user choice; online TTT in particular exercises invite + match-state tables for SQL demo | ⚠️ Revisit — porting all three games is the largest scope risk in the timeline |
| Form login + BCrypt | Standard Spring Security default; sufficient for an academic demo without OAuth complexity | — Pending |
| Build the schema fresh, do not migrate existing file-tree data | Migration is a different project; the existing data is throwaway test content | — Pending |
| New Spring Boot app lives in `./app/` at workspace root; `DB_project/` stays untouched as reference (its own git repo) | Cleanest separation between reference codebase and new build; lets the report cite the old design without fear of breaking it | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after initialization*
