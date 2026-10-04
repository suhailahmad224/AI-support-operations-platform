# Contributing to AI Support & Operations Platform

Thank you for your interest in contributing to the **AI Support & Operations Platform**. This document provides guidelines for local setup, development workflows, testing, and pull requests.

---

## 1. Prerequisites

- **Node.js**: `v18.x` or `v20.x` LTS
- **npm**: `v9.x` or `v10.x`
- **MongoDB** *(Optional)*: Standalone MongoDB `v6.x+` (if omitted, the platform automatically starts an embedded in-memory MongoDB instance in development mode).

---

## 2. Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/ai-support-platform.git
   cd ai-support-platform
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example backend/.env
   ```

4. **Start the local development servers**:
   In two separate terminal windows (or tabs):

   **Terminal 1 (Backend)**:
   ```bash
   npm run backend
   ```
   *Runs at `http://localhost:5000` with nodemon auto-reload.*

   **Terminal 2 (Frontend)**:
   ```bash
   npm run frontend
   ```
   *Runs at `http://localhost:5173` with Vite HMR.*

---

## 3. Demo Credentials

The backend automatically seeds three role-specific demo accounts on startup:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@platform.com` | `AdminPass123!` | Full system administration, user management, knowledge base editor, and analytics. |
| **Agent** | `agent@platform.com` | `AgentPass123!` | Unassigned ticket queue, assigned ticket handling, internal notes, and AI reply drafts. |
| **Customer** | `customer@platform.com` | `CustomerPass123!` | Ticket creation, conversation replies, CSAT review submission, and knowledge base. |

*In the frontend, a developer quick-login bar at the top allows instantaneous single-click switching between accounts.*

---

## 4. Development Workflow & Standards

- **Code Style**:
  - Backend: Clean CommonJS, explicit async/await, centralized error handling via `next(err)`.
  - Frontend: React 18 functional components, hooks, TailwindCSS utility classes.
- **Security Invariants**:
  - Never commit `.env` or files containing secret keys.
  - Never return password hashes in API responses (`select: false` on Mongoose schema).
  - All database queries involving user input must use parameterized filters and regex escaping (`escapeRegex`).
  - Customer queries must strictly enforce ownership checks.
  - Internal staff notes (`isInternal: true`) must never leak to customers in messages or audit logs.

---

## 5. Running Automated Verification Suites

Before submitting any changes, verify that all test suites pass without regression:

```bash
# Run full automated test suite from repository root
npm test

# Run individual test suites from backend/ directory
cd backend
npm run test:security      # Phase 10: Security hardening, NoSQL injection, ReDoS, notes privacy
npm run test:analytics     # Phase 9: Analytics, SLA metrics, agent workload, CSAT reviews
npm run test:knowledge     # Phase 8: Knowledge base management, BM25 retrieval, RAG Q&A
npm run test:ai            # Phase 7: Deterministic AI analysis, reply suggestions
npm run test:messaging     # Phase 6: Ticket conversations, internal notes, notifications
npm run test:tickets       # Phase 4/5: Ticket state machine, lifecycle transitions, RBAC
npm run test:users         # Phase 3: User/agent management, profiles, status toggling
npm run test:auth          # Phase 2: Registration, login, password hashing, JWT guards
```

### Validating the Frontend Production Bundle
```bash
npm run build
```
*Ensures the Vite build completes with zero lint or packaging errors.*

---

## 6. Pull Request Guidelines

1. Create a feature branch: `git checkout -b feat/your-feature-name`.
2. Commit with clear, descriptive messages: `git commit -m "feat(tickets): add SLA countdown indicator"`.
3. Verify that all 127 automated backend tests and the frontend build succeed.
4. Push your branch and open a Pull Request against `main`.
