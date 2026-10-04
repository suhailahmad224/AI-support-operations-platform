# API Reference Documentation

All endpoints are rooted under `/api`. Standard responses follow a unified envelope:

```json
// Success Response
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}

// Error Response
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "details": null
  }
}
```

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Register a new customer account.
- **Access**: Public (Rate-limited: 15 req/15m in production)
- **Request Body**:
  ```json
  {
    "name": "Jane Customer",
    "email": "jane@example.com",
    "password": "Password123!",
    "department": "General"
  }
  ```
- **Response**: `201 Created` with user object and JWT bearer token.

### `POST /api/auth/login`
Authenticate existing user and issue JWT.
- **Access**: Public (Rate-limited: 15 req/15m in production)
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK` with user profile and signed JWT token.

### `GET /api/auth/me`
Retrieve authenticated profile from JWT session.
- **Access**: Bearer Token (All authenticated roles)
- **Response**: `200 OK` with formatted user profile.

### `POST /api/auth/logout`
Acknowledge session termination and log event.
- **Access**: Bearer Token (All authenticated roles)
- **Response**: `200 OK`

### `POST /api/auth/seed`
Seed default demo accounts.
- **Access**: Development mode only (`403 Forbidden` in production).
- **Response**: `200 OK`

---

## 2. Tickets (`/api/tickets`)

### `POST /api/tickets`
Create a new support ticket.
- **Access**: Customer, Admin
- **Request Body**:
  ```json
  {
    "title": "504 Gateway Timeout during checkout",
    "description": "Payments are failing immediately with a 504 error.",
    "category": "technical",
    "priority": "HIGH"
  }
  ```
- **Response**: `201 Created` with generated `ticketId` (`TCK-XXXXX`).

### `GET /api/tickets`
List tickets with role-based scoping, search, and pagination.
- **Access**:
  - `customer`: Strictly scoped to tickets created by the authenticated customer.
  - `agent`: Defaults to tickets assigned to the agent; optionally `?queue=unassigned` or `?queue=all`.
  - `admin`: All tickets across the organization.
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `search`: Keyword search across ticket ID, title, description (ReDoS-safe)
  - `status`: Filter by status (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, `CLOSED`)
  - `priority`: Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `category`: Filter by category (`technical`, `billing`, `account`, `feature_request`, `general`)
- **Response**: `200 OK` with paginated records and metadata.

### `GET /api/tickets/stats`
Retrieve ticket metric counters scoped to the user role.
- **Access**: Customer, Agent, Admin
- **Response**: `200 OK`

### `GET /api/tickets/:id`
Retrieve ticket details by MongoDB ID or human-readable `ticketId`.
- **Access**: Owner Customer, Agent, Admin
- **Security**: Customers only receive public audit history; `INTERNAL_NOTE_ADDED` logs are filtered out.
- **Response**: `200 OK` with ticket and activity history.

### `PUT /api/tickets/:id`
Update ticket content (title, description, priority, category).
- **Access**: Customer (only while ticket is `OPEN`), Assigned Agent, Admin
- **Response**: `200 OK`

### `PATCH /api/tickets/:id/status`
Transition ticket status according to state machine rules.
- **Access**:
  - `customer`: Can only move `RESOLVED`/`CLOSED` $\leftrightarrow$ `OPEN` or close tickets.
  - `agent`: Can update status on assigned tickets.
  - `admin`: Full state machine transition control.
- **Request Body**:
  ```json
  { "status": "IN_PROGRESS" }
  ```
- **Response**: `200 OK`

### `PATCH /api/tickets/:id/assign`
Assign ticket to an agent or claim for self.
- **Access**:
  - `agent`: Can claim unassigned tickets (`assignedAgent: null`).
  - `admin`: Can assign/reassign to any active agent.
- **Request Body**:
  ```json
  { "agentId": "650c... (optional for agents, defaults to self)" }
  ```
- **Response**: `200 OK`

### `DELETE /api/tickets/:id`
Permanently remove a ticket and associated audit logs.
- **Access**: Admin only
- **Response**: `200 OK`

---

## 3. Customer Satisfaction (CSAT) (`/api/tickets/:id/feedback`)

### `POST /api/tickets/:id/feedback`
Submit a 1–5 star review and optional comment for a resolved or closed ticket.
- **Access**: Owner Customer, Admin
- **Eligibility**: Ticket status must be `RESOLVED` or `CLOSED`.
- **Duplicate Prevention**: Returns `409 Conflict` if feedback already exists.
- **Request Body**:
  ```json
  {
    "rating": 5,
    "comment": "Quick and helpful support resolution!"
  }
  ```
- **Response**: `201 Created`

### `GET /api/tickets/:id/feedback`
Retrieve submitted feedback for a ticket.
- **Access**: Owner Customer, Agent, Admin
- **Response**: `200 OK`

---

## 4. Ticket Messaging & Internal Notes (`/api/tickets/:id/messages`)

### `GET /api/tickets/:id/messages`
Retrieve chronological conversation thread.
- **Access**: Owner Customer, Agent, Admin
- **Privacy Enforcement**: For `customer` role, `isInternal: true` private notes are strictly filtered out at the database level.
- **Response**: `200 OK`

### `POST /api/tickets/:id/messages`
Post a customer message or staff internal note.
- **Access**:
  - `customer`: Can post public messages (`isInternal: false`).
  - `agent` / `admin`: Can post public messages or private internal notes (`isInternal: true`).
- **Request Body**:
  ```json
  {
    "message": "We have identified the issue and pushed a patch.",
    "isInternal": false,
    "attachments": []
  }
  ```
- **Response**: `201 Created`

---

## 5. AI Ticket Intelligence (`/api/tickets/:id/ai`)

### `POST /api/tickets/:id/ai/analyze`
Generate deterministic AI analysis (category, priority, sentiment, intent, summary).
- **Access**: Owner Customer, Agent, Admin
- **Rate Limit**: 40 req/min in production
- **Response**: `200 OK` with suggested metadata.

### `POST /api/tickets/:id/ai/apply`
Apply reviewed AI suggestions to the ticket document.
- **Access**: Agent (assigned or unassigned tickets), Admin
- **Security**: Ownership and ticket status cannot be changed via AI application.
- **Response**: `200 OK`

### `POST /api/tickets/:id/ai/suggest-reply`
Generate contextual draft reply for support staff.
- **Access**: Agent, Admin (Restricted from Customer)
- **Privacy**: Internal notes are excluded from reply generation context.
- **Response**: `200 OK`

---

## 6. Knowledge Base & RAG (`/api/articles`)

### `GET /api/articles`
List knowledge articles with search and category filtering.
- **Access**: Public / Optional Auth (Unpublished drafts visible to Admins only)
- **Query Parameters**: `category`, `search`, `page`, `limit`
- **Response**: `200 OK`

### `GET /api/articles/:slugOrId`
Get single article by slug or ObjectId.
- **Access**: Public / Optional Auth (Unpublished drafts return 404 for non-admins)
- **Response**: `200 OK`

### `POST /api/articles`
Create a new knowledge base article (auto-chunks into semantic segments).
- **Access**: Admin only
- **Response**: `201 Created`

### `PUT /api/articles/:id`
Update an article and re-chunk content.
- **Access**: Admin only
- **Response**: `200 OK`

### `PATCH /api/articles/:id/publish`
Toggle publication state (`isPublished: true/false`).
- **Access**: Admin only
- **Response**: `200 OK`

### `DELETE /api/articles/:id`
Delete an article and its pre-computed chunks.
- **Access**: Admin only
- **Response**: `200 OK`

### `POST /api/articles/rag/search`
Lexical BM25 chunk search across published articles.
- **Access**: Public / Optional Auth
- **Request Body**:
  ```json
  { "query": "how to configure 2FA", "topK": 4 }
  ```
- **Response**: `200 OK` with ranked semantic chunks.

### `POST /api/articles/rag/ask`
Knowledge Assistant grounded question-answering with source citations.
- **Access**: Public / Optional Auth
- **Request Body**:
  ```json
  { "query": "What happens if I lose my 2FA phone?" }
  ```
- **Response**: `200 OK` with synthesized answer and source citations.

---

## 7. Analytics & SLA Dashboard (`/api/analytics`)

### `GET /api/analytics/dashboard`
Overview metrics, status/priority/category breakdowns, FRT, and MTTR.
- **Access**: Admin only
- **Query Parameters**: `?range=7d|30d|90d|all` or `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Response**: `200 OK`

### `GET /api/analytics/agents`
Agent workload, active ticket load, resolved counts, and individual CSAT scores.
- **Access**: Admin only
- **Response**: `200 OK`

### `GET /api/analytics/csat`
CSAT percentage benchmark, 1–5 star distribution, and recent customer reviews.
- **Access**: Admin only
- **Response**: `200 OK`

---

## 8. Notifications (`/api/notifications`)

### `GET /api/notifications`
Get user notifications with pagination.
- **Access**: All authenticated roles (scoped to recipient)
- **Response**: `200 OK`

### `GET /api/notifications/unread-count`
Get count of unread notifications.
- **Access**: All authenticated roles
- **Response**: `200 OK`

### `PATCH /api/notifications/:id/read`
Mark a single notification as read.
- **Access**: All authenticated roles (enforces recipient ownership)
- **Response**: `200 OK`

### `PATCH /api/notifications/mark-all-read`
Mark all notifications as read for current user.
- **Access**: All authenticated roles
- **Response**: `200 OK`

---

## 9. User & Agent Management (`/api/users` & `/api/agents`)

### `GET /api/users`
List users with pagination, role, department, and status filters.
- **Access**: Admin only
- **Response**: `200 OK`

### `POST /api/users`
Create a new user or agent account.
- **Access**: Admin only
- **Response**: `201 Created`

### `PUT /api/users/:id`
Update user details or role. Self-demotion from admin is prohibited.
- **Access**: Admin only
- **Response**: `200 OK`

### `PATCH /api/users/:id/status`
Toggle user active/inactive status. Self-deactivation by admin is prohibited.
- **Access**: Admin only
- **Response**: `200 OK`

### `GET /api/users/profile/me`
Retrieve own user profile.
- **Access**: All authenticated roles
- **Response**: `200 OK`

### `PUT /api/users/profile/me`
Update own profile (name, department, avatar, password change). Role escalation is blocked.
- **Access**: All authenticated roles
- **Response**: `200 OK`

### `GET /api/agents`
List support agents with workload counts and departments.
- **Access**: Agent, Admin
- **Response**: `200 OK`

---

## 10. System Health (`/api/health`)

### `GET /api/health`
System diagnostics and database connectivity check.
- **Access**: Public
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "uptimeSeconds": 24150,
      "environment": "development",
      "database": {
        "status": "connected",
        "name": "ai_support_platform"
      },
      "aiProvider": "mock"
    }
  }
  ```
