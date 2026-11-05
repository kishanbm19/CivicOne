# CivicOne – Unified Digital Identity & Secure Citizen Services Platform

**AI-Powered | Multi-Organization | Full-Stack Civic Services Platform**

CivicOne is a secure, responsive, full-stack civic services platform designed to consolidate citizen interactions with essential public-service departments under a unified digital identity.

The platform integrates three major service domains:

- **Transport Services** – Bus operations, transport safety and infrastructure.
- **Municipal Services** – Roads, drainage, sanitation, streetlights and water supply.
- **Healthcare Services** – Hospitals, clinics and healthcare facility management.

CivicOne provides dedicated, role-isolated portals for citizens and government personnel, enabling transparent complaint management, AI-assisted classification, departmental coordination, healthcare service access and secure public-service delivery.

---

## Table of Contents

- [Key Features](#-key-features)
- [Service Domains](#-service-domains)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [User Roles and Access Control](#-user-roles-and-access-control)
- [Core Workflows](#-core-workflows)
- [Database Architecture](#-database-architecture)
- [Security and Privacy](#-security-and-privacy)
- [Project Structure](#-project-structure)
- [Installation and Setup](#-installation-and-setup)
- [Docker Deployment](#-docker-deployment)
- [Testing](#-testing)
- [Future Enhancements](#-future-enhancements)

---

## 🚀 Key Features

### 1. Citizen Portal

A dedicated public-facing portal that enables citizens to access civic services through a unified interface.

- Citizen registration and authentication.
- Submit complaints across multiple service domains.
- Manual address-based complaint submission.
- Upload photographic evidence.
- Track complaint progress through activity timelines.
- Access public circulars and announcements.
- Explore healthcare facilities and clinic directories.
- Submit healthcare appointment requests.
- Manage cross-service consent.
- Receive in-app notifications.
- Manage profile information and account settings.

### 2. Government Portal

A separate portal for authorized government personnel to manage departmental operations.

- Department-scoped complaint management.
- Complaint assignment and resolution.
- Staff workload monitoring.
- SLA deadline tracking and overdue identification.
- Protected evidence and internal notes.
- Department and staff administration.
- Organization-level analytics.
- Document review and publishing.
- Audit history and operational activity tracking.
- Notification management.

### 3. AI-Assisted Complaint Classification

CivicOne integrates AI-assisted complaint classification to reduce manual categorization and support efficient departmental routing.

Key capabilities:

- Analyses citizen-submitted complaint descriptions.
- Identifies relevant complaint categories.
- Supports departmental routing.
- Uses structured response validation through Pydantic.
- Provides deterministic keyword-based fallback rules when the external AI provider is unavailable.
- Supports manual review when classification requires further verification.

### 4. Complaint Lifecycle Management

A centralized complaint management system maintains the current status, assignment details and historical activity of every complaint.

The platform uses four canonical complaint statuses:

| Status | Description |
|---|---|
| `submitted` | Complaint has been submitted by a citizen. |
| `assigned` | Complaint has been assigned for handling. |
| `in_progress` | Department staff are working on the complaint. |
| `resolved` | Complaint resolution has been recorded. |

Supported transitions:

```text
submitted
    |
    v
assigned
    |
    v
in_progress
    |
    v
resolved
```

An assigned complaint may also transition directly to resolved when appropriate.

Additional capabilities:

- Automatic complaint reference generation.
- Staff assignment notifications.
- Complaint activity and status history.
- Duplicate-submission protection.
- Transactional status updates.
- Row-level locking for concurrent assignment and status operations.
- SLA deadline monitoring.
- Overdue complaint identification.

**Note:** Overdue is a calculated condition based on the resolution deadline and current complaint status. It is not a separate complaint status.

### 5. Document and Public Announcement Management

CivicOne provides a structured document publishing and approval workflow.

The four publishing stages are:

1. **Draft** – Document or announcement is created.
2. **Review** – Submitted for authorized verification.
3. **Approved** – Formally approved by an authorized reviewer.
4. **Published** – Made available to the intended audience according to its publication schedule.

Additional functionality:

- Department-specific documents.
- Public circulars and announcements.
- Scheduled publication and expiry.
- Targeted announcements.
- Review feedback and resubmission.
- Protected document attachments.
- Access-controlled document downloads.

### 6. Analytics and SLA Monitoring

Database-backed analytics provide operational insights to authorized government personnel.

Features include:

- Pending complaint statistics.
- Assigned complaint counts.
- In-progress complaint counts.
- Resolved complaint statistics.
- Overdue complaint identification.
- Department workload monitoring.
- Complaint resolution metrics.
- Organization-level performance insights.

The dashboard uses the canonical four-status complaint model to maintain consistency between database records and displayed statistics.

### 7. Notification Management

The notification system supports communication between citizens and government personnel.

- Complaint assignment notifications.
- Citizen-facing complaint updates.
- Staff assignment alerts.
- Document review notifications.
- Announcement-related notifications.
- Unread notification tracking.

### 8. Healthcare Services

The Healthcare domain provides dedicated public healthcare functionality.

- Healthcare facility directory.
- Hospital and clinic information.
- Facility management.
- Appointment request submission.
- Healthcare service access through the Citizen Portal.

### 9. Cross-Service Consent Management

CivicOne includes a consent management module that enables citizens to manage consent across supported service domains.

- Grant consent.
- Revoke consent.
- Maintain consent records.
- Record consent-related activities.
- Support controlled cross-domain data access.

---

## 🏛️ Service Domains

CivicOne integrates three public-service domains with dedicated visual identities and department structures.

| Service Domain | Departments | Visual Identity |
|---|---|---|
| Transport Services | Bus Operations, Transport Safety, Bus Stops and Infrastructure | Blue and Cyan |
| Municipal Services | Roads, Drainage, Sanitation, Streetlights, Water Supply | Green and Teal |
| Healthcare Services | Hospitals and Clinics, Facility Management | Coral and Soft Red |

Each domain operates within the centralized platform while maintaining appropriate organizational and departmental access boundaries.

---

## 🏗️ System Architecture

CivicOne follows a modular full-stack architecture consisting of a React frontend, FastAPI backend and relational PostgreSQL database.

```text
                 CIVICONE PLATFORM
                         |
             +-----------+-----------+
             |                       |
        CITIZEN PORTAL          GOVERNMENT PORTAL
             |                       |
             +-----------+-----------+
                         |
                   React Frontend
                         |
                  RESTful API Layer
                         |
                   FastAPI Backend
                         |
        +----------------+----------------+
        |                |                |
   Authentication   Business Logic    AI Services
        |                |                |
        +----------------+----------------+
                         |
                 SQLAlchemy ORM
                         |
                  PostgreSQL
                         |
              Relational Data Storage
```

### Architectural Components

**Frontend Layer**
- Citizen and government interfaces.
- Protected routes and portal separation.
- Authentication context.
- Modular API integration.
- Responsive UI components.
- Analytics visualizations.

**Backend Layer**
- RESTful API endpoints.
- Authentication and authorization.
- Complaint lifecycle management.
- Department routing and permissions.
- AI classification services.
- Notification and document workflows.

**Database Layer**
- Relational data modelling.
- Foreign-key relationships.
- Database constraints.
- Transaction management.
- Version-controlled migrations.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 |
| Build Tool | Vite 5 |
| Language | JavaScript ES6+, JSX |
| Styling | Tailwind CSS 3.4 |
| Routing | React Router DOM 6 |
| State Management | React Context API |
| Data Visualization | Recharts |
| Icons | Lucide React |
| Backend Framework | Python FastAPI |
| Backend Server | Uvicorn |
| ORM | SQLAlchemy 2.x |
| Database | PostgreSQL / SQLite |
| Database Migrations | Alembic |
| Validation | Pydantic v2 |
| Authentication | JWT |
| Password Security | Argon2id |
| AI Integration | OpenAI API |
| Backend Testing | Pytest, HTTPX |
| Frontend Testing | Vitest, React Testing Library |
| Containerization | Docker, Docker Compose |
| Web Server | Nginx |

---

## 🔐 User Roles and Access Control

CivicOne implements backend-enforced Role-Based Access Control (RBAC).

### Platform Roles

| Role | Responsibilities |
|---|---|
| Citizen | Submit complaints, track progress and access public services. |
| Staff | Handle complaints according to active department memberships. |
| Organization Admin | Manage operations within the assigned organization. |
| Platform Admin | Perform authorized platform-level administrative operations. |

### Department-Level Roles

Department memberships determine the permissions and responsibilities of staff within their respective departments.

The system supports department-specific responsibilities such as staff members, leads, supervisors and authorized administrative personnel.

### Access Isolation

- Citizens can access only their own complaints and notifications.
- Staff access is restricted to their authorized department memberships.
- Organization administrators are scoped to their respective organizations.
- Cross-organization access is restricted.
- Platform administrators follow a separate administrative access policy.

All important permissions are enforced by the backend rather than relying only on frontend route restrictions.

---

## 🔄 Core Workflows

### 1. Manual Address-Based Complaint Submission

1. Citizen selects a service domain.
2. Selects the relevant complaint category.
3. Enters a title and detailed description.
4. Provides the street address, landmark and locality manually.
5. Optionally uploads photographic evidence.
6. AI-assisted classification supports category identification and departmental routing.
7. A complaint reference is generated.
8. The complaint is stored and made available to authorized personnel.

**Privacy principle:** CivicOne uses manual address entry. It does not utilize GPS, device geolocation APIs or live location tracking.

### 2. Complaint Assignment and Resolution

```text
Citizen Submission
        |
        v
AI-Assisted Classification
        |
        v
Department Routing
        |
        v
Staff Assignment
        |
        v
Complaint Processing
        |
        v
Resolution
        |
        v
Citizen Notification
```

Complaint status changes and important actions are recorded for traceability.

### 3. Document Publishing Workflow

```text
Draft
  |
  v
Review
  |
  v
Approved
  |
  v
Published
```

Authorized reviewers can provide feedback, request revisions or reject documents according to the publishing workflow.

### 4. Healthcare Appointment Workflow

Citizens can browse healthcare facilities and submit appointment requests through the Healthcare Services module.

### 5. Consent Management Workflow

Citizens can grant or revoke consent for supported cross-service interactions, with consent activities recorded in the database.

---

## 🗄️ Database Architecture

CivicOne uses PostgreSQL as its primary relational database and SQLAlchemy for object-relational mapping.

Important database entities include:

| Table | Purpose |
|---|---|
| `users` | Stores citizen, staff and administrator accounts. |
| `organizations` | Stores service organizations. |
| `departments` | Stores departments within organizations. |
| `department_memberships` | Maps staff to departments and departmental roles. |
| `complaints` | Stores complaint details and current status. |
| `complaint_activities` | Records complaint-related activities. |
| `complaint_status_history` | Maintains status-change history. |
| `complaint_evidence` | Stores complaint evidence metadata. |
| `complaint_internal_notes` | Stores internal departmental notes. |
| `department_slas` | Defines departmental service-level targets. |
| `documents` | Stores documents and public announcements. |
| `notifications` | Stores user notifications. |
| `audit_events` | Records important administrative and security events. |
| `consent_grants` | Stores consent records. |
| `healthcare_facilities` | Stores healthcare facility information. |
| `appointment_requests` | Stores healthcare appointment requests. |
| `refresh_sessions` | Manages refresh-token sessions. |
| `password_reset_tokens` | Manages password-reset tokens. |

Database integrity is maintained through primary keys, foreign keys, unique constraints, check constraints and transactional operations.

Alembic provides version-controlled database schema migrations.

---

## 🛡️ Security and Privacy

CivicOne incorporates several security mechanisms:

- JWT-based authentication.
- Argon2id password hashing.
- Refresh-session rotation.
- Role-Based Access Control.
- Organization-level data isolation.
- Department-level authorization.
- Secure document access.
- Protected complaint evidence.
- Password-reset token hashing and revocation.
- Audit logging for security-sensitive actions.
- Backend validation using Pydantic.
- Database constraints for data integrity.
- Manual address-based complaint submission without GPS tracking.

---

## 📂 Project Structure

```text
civicone/
│
├── docker-compose.yml
├── README.md
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   │
│   ├── migrations/
│   │   └── versions/
│   │
│   ├── tests/
│   │
│   └── app/
│       ├── main.py
│       ├── models.py
│       │
│       ├── core/
│       │   ├── config.py
│       │   ├── database.py
│       │   ├── security.py
│       │   ├── dependencies.py
│       │   └── logging.py
│       │
│       ├── ai/
│       │   ├── service.py
│       │   └── fallback.py
│       │
│       ├── policies/
│       │   ├── permissions.py
│       │   └── routing.py
│       │
│       └── routers/
│           ├── auth.py
│           ├── complaints.py
│           ├── documents.py
│           ├── consent.py
│           ├── notifications.py
│           ├── services.py
│           ├── analytics.py
│           └── admin.py
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    │
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── api/
        ├── context/
        ├── components/
        ├── layouts/
        ├── routes/
        ├── tests/
        └── pages/
```

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following:

- Python 3.11 or later.
- Node.js and npm.
- PostgreSQL, if using PostgreSQL locally.
- Git.
- Docker and Docker Compose (optional).

### 1. Clone the Repository

```bash
git clone https://github.com/kishanbm19/CivicOne.git

cd CivicOne
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it.

**Windows:**

```powershell
.\venv\Scripts\activate
```

**Linux/macOS:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure environment variables using the supplied `.env.example` file.

Ensure that the database URL and required authentication and AI configuration values are correctly configured.

Run database migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend API:

```text
http://localhost:8000
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure frontend environment variables using `.env.example`.

Start the development server:

```bash
npm run dev
```

Frontend application:

```text
http://localhost:5173
```

---

## 🐳 Docker Deployment

CivicOne supports containerized deployment using Docker Compose.

From the project root:

```bash
docker-compose up --build
```

The application services include:

- PostgreSQL database.
- FastAPI backend.
- React frontend served through Nginx.

Configure the required environment variables before deployment.

Default local service addresses:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

---

## 🧪 Testing

CivicOne includes automated backend and frontend test suites.

### Backend Testing

Navigate to the backend directory:

```bash
cd backend
```

Run:

```bash
python -m pytest -v
```

The test suite covers areas including:

- Citizen registration and portal isolation.
- Authentication and authorization.
- Complaint creation and reference generation.
- Complaint routing and lifecycle transitions.
- Cross-user complaint ownership restrictions.
- Internal note access restrictions.
- Document review and publishing workflows.
- Consent granting and revocation.
- Document security.
- Password-reset security.
- Complaint analytics and consistency.

### Frontend Testing

Navigate to the frontend directory:

```bash
cd frontend
```

Run:

```bash
npm run test
```

Frontend tests validate component rendering, dashboards, status indicators and route access restrictions.

### Production Build

```bash
npm run build
```

This validates frontend compilation, JSX syntax, asset bundling and production build generation.

### Latest Reported Test Results

According to the latest consistency audit:

| Test Suite | Result |
|---|---:|
| Backend tests | 68 passed |
| Frontend tests | 32 passed |
| Frontend production build | 0 errors |

These results correspond to the tested project version documented in the consistency audit.

---

## 🔮 Future Enhancements

CivicOne is designed with an extensible architecture. The following enhancements can further improve its intelligence, scalability and accessibility.

### 1. Advanced AI and NLP

- Improve complaint classification using advanced NLP models.
- Introduce multilingual complaint understanding.
- Detect duplicate and related complaints.
- Generate AI-assisted complaint summaries.
- Recommend departments based on complaint context.

### 2. Asynchronous Background Processing

Integrate Celery and Redis to process time-consuming tasks independently of API requests.

Potential applications include:

- AI complaint classification.
- Automated departmental routing.
- Notification delivery.
- Scheduled SLA reminders.
- Complaint escalation workflows.

### 3. Real-Time Communication

Introduce WebSocket-based communication for real-time complaint updates, staff notifications and operational alerts.

### 4. Predictive Analytics

Develop predictive models to:

- Forecast complaint volumes.
- Identify recurring civic problems.
- Estimate resolution delays.
- Analyse departmental workloads.
- Identify service-delivery trends.

### 5. Mobile Application

Develop dedicated Android and iOS applications to improve access to civic services.

### 6. Advanced Performance and Scalability

- Implement Redis caching.
- Optimize database queries and indexing.
- Conduct load and stress testing.
- Introduce horizontal application scaling.
- Improve database connection management.

### 7. Monitoring and Observability

Integrate tools such as Prometheus and Grafana for application monitoring, infrastructure metrics, API latency and database performance.

### 8. Multilingual Citizen Services

Introduce support for Kannada and other regional languages to make civic services accessible to a wider population.

### 9. Government Service Integration

Explore secure integrations with existing government portals and public-service systems to enable improved data exchange.

### 10. Privacy-Conscious Geographic Analytics

Explore complaint hotspot analysis using manually supplied addresses and locality information without introducing live device location tracking.

---

## 🎯 Project Vision

CivicOne aims to establish a unified digital ecosystem that connects citizens with public-service organizations through secure identity management, intelligent complaint processing and transparent administrative workflows.

By combining modern full-stack technologies, AI-assisted classification, relational database management and secure access control, the platform provides a foundation for more accessible, accountable and efficient digital civic services.

**CivicOne – One Platform. Multiple Services. Better Civic Experiences.**
