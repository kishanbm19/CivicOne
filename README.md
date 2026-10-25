# CivicOne — Unified Digital Identity & Secure Citizen Services Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20(JavaScript%20only)-61DAFB.svg?logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%203.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)
[![SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy%202.x-D71F00.svg)](https://www.sqlalchemy.org)
[![Alembic](https://img.shields.io/badge/Migrations-Alembic-blue.svg)](https://alembic.sqlalchemy.org)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED.svg?logo=docker)](https://www.docker.com)

**CivicOne** is a secure, responsive, full-stack civic services platform designed to consolidate citizen interactions with essential public departments—**Transport Services**, **Municipal Infrastructure**, and **Public Healthcare**—under a unified digital identity.

The platform provides two dedicated, role-isolated portals:
1. **Citizen Portal**: Public-facing civic services, manual address-based complaint submission (strictly no GPS or live location tracking), live complaint tracking timelines, public circulars, healthcare clinic directories, appointment booking, and cross-service consent management.
2. **Government Portal**: Dedicated operational dashboard for department staff and administrators, featuring department queue management, complaint status life-cycle state machines, private internal staff notes, a 4-stage document publishing workflow (Draft → Review → Approved → Published), staff account provisioning, and database-backed analytics.

---

## 🎨 Service Domains & Visual Identity

CivicOne implements tailored visual identities and color palettes for each civic service domain:

| Domain | Accent & Palette | Department Focus | Portal Identity |
| :--- | :--- | :--- | :--- |
| **Transport Services** | Blue & Cyan (`#2563EB`) | Transit bus operations, shelters, bus stops, urban commuter corridors. | Dark Navy sidebar (`#0B192C`) |
| **Municipal Services** | Green & Teal (`#10B981`) | Solid waste collection, roads, potholes, streetlights, drainage. | Forest Green sidebar (`#064e3b`) |
| **Healthcare Services** | Coral & Soft Red (`#F43F5E`) | Public health clinics, medical equipment, appointments, public health camps. | Burgundy sidebar (`#450a0a`) |

---

## 🏛️ System Architecture & Technology Stack

### Frontend
- **Framework**: React 18 with Vite 5.
- **Language**: JavaScript (ES6+) and JSX only (`.js`, `.jsx`).
- **Styling**: Tailwind CSS 3.4 with custom domain design tokens, responsive cards, and accessible typography.
- **Routing**: React Router DOM 6 with authentication and portal guards.
- **State & Authentication**: React Context API (`AuthContext`) with persistent JWT storage and automatic token refresh handling.
- **Data Visualization**: Recharts (Line charts, Bar charts, Donut charts).
- **Icons**: Lucide React.
- **Testing**: Vitest & React Testing Library with jsdom.

### Backend
- **Framework**: FastAPI (Python 3.11).
- **Server**: Uvicorn.
- **ORM & Database**: SQLAlchemy 2.x supporting PostgreSQL (Production / Docker) and SQLite (Local development).
- **Database Migrations**: Alembic version-controlled schema migrations.
- **Validation**: Pydantic v2 schemas for request and response payloads.
- **Authentication & Security**: Argon2id password hashing, JWT access tokens, refresh session rotation, RBAC, and immutable audit logging.
- **AI Classification**: OpenAI API integration with structured Pydantic schema validation and deterministic keyword/priority fallbacks.
- **Testing**: Pytest with HTTPX test client.

---

## 📂 Project Directory Structure

```text
civicone/
├── docker-compose.yml              # Multi-container orchestration (PostgreSQL, Backend, Frontend)
├── .gitignore
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── .env.example
│   ├── migrations/                 # Alembic database migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── tests/                      # Pytest unit and integration test suite
│   │   └── test_civicone.py
│   └── app/
│       ├── main.py                 # FastAPI application & router mounting
│       ├── core/
│       │   ├── config.py           # Environment settings via Pydantic
│       │   ├── database.py         # SQLAlchemy engine & session factory
│       │   ├── security.py         # Argon2id hashing & JWT token management
│       │   ├── dependencies.py     # RBAC & department authorization guards
│       │   └── logging.py          # Security audit event logger
│       ├── models.py               # Normalized SQLAlchemy database models
│       ├── ai/
│       │   ├── service.py          # OpenAI classification service
│       │   └── fallback.py         # Deterministic keyword routing rules
│       ├── policies/
│       │   ├── permissions.py      # Complaint state-machine transition validator
│       │   └── routing.py          # Department routing logic
│       └── routers/
│           ├── auth.py             # Citizen/Gov login, registration, refresh, reset
│           ├── complaints.py       # Address complaint submission & status history
│           ├── documents.py        # 4-stage document review and publishing
│           ├── consent.py          # Cross-domain citizen consent management
│           ├── notifications.py    # In-app notifications with unread tracking
│           ├── services.py         # Healthcare facilities & appointment booking
│           ├── analytics.py        # Database-backed dashboard metrics
│           └── admin.py            # Organization, department, and staff provisioning
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css               # Design system tokens and styles
        ├── api/                    # Modular Axios client & API endpoints
        │   ├── axios.js
        │   ├── auth.js
        │   ├── complaints.js
        │   ├── documents.js
        │   ├── services.js
        │   └── index.js
        ├── context/
        │   └── AuthContext.jsx     # Session, staff profiling, and notifications
        ├── components/
        │   ├── common/             # Logo, StatusBadge, PriorityBadge, HeroIllustrations
        │   ├── navigation/         # CitizenNavbar, PublicNavbar, GovSidebar, GovTopBar
        │   └── dashboard/          # StatCard, NoticeCard, ComplaintTable
        ├── layouts/
        │   ├── PublicLayout.jsx
        │   ├── CitizenLayout.jsx
        │   └── GovernmentLayout.jsx
        ├── routes/
        │   └── AppRoutes.jsx       # Route guards and URL mappings
        ├── tests/
        │   └── civicone.test.jsx   # Vitest frontend component tests
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx           # Clean, unified login portal
            ├── Register.jsx        # Citizen account registration
            ├── PasswordReset.jsx
            ├── TransportCitizenPortal.jsx   # Dedicated Transport service page
            ├── MunicipalCitizenPortal.jsx   # Dedicated Municipal service page
            ├── HealthcareCitizenPortal.jsx  # Dedicated Healthcare service page
            ├── CitizenDashboard.jsx
            ├── MyComplaints.jsx
            ├── NewComplaint.jsx    # 3-step wizard with strict manual address entry
            ├── ComplaintDetail.jsx # Live timeline, internal notes, and reopen controls
            ├── PublishedNotices.jsx
            ├── ConsentManagement.jsx
            ├── HealthcareServices.jsx
            ├── NotificationsPage.jsx
            ├── ProfileSettings.jsx
            ├── HelpSupport.jsx
            ├── GovDashboard.jsx    # Staff dashboard with domain themes & metrics
            ├── GovComplaints.jsx
            ├── GovDocuments.jsx
            ├── GovAnalytics.jsx
            ├── GovStaffManagement.jsx
            ├── GovOrganizations.jsx
            ├── GovAuditLogs.jsx
            └── Misc.jsx            # Unauthorized and NotFound views
```

---

## 🚀 Setup & Execution Instructions

### Local Development

#### 1. Backend Setup
```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations to initialize schema
alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger Documentation: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

#### 2. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
- Frontend Application URL: `http://localhost:5173`

---

### Docker Deployment

To launch the entire platform with PostgreSQL, FastAPI, and React/Nginx in isolated containers:

```bash
docker-compose up --build
```

Services exposed:
- React Frontend: `http://localhost:5173`
- FastAPI Backend: `http://localhost:8000`
- PostgreSQL Database: `localhost:5432`

---

## 👥 Authentication & Portal Access

The application cleanly separates public citizens from authorized government personnel:

### 1. Citizen Portal (`/login`, `/register`)
- **Self-Registration**: Anyone can register a new Citizen account via `/register` by providing their full name, email address, password, and phone number.
- **Access**: Access the Citizen Dashboard, file issues across Transport, Municipal, and Healthcare departments, track status timelines, and manage consent.

### 2. Government Staff Portal (`/government/login`)
- **Staff Access**: Authorized personnel log in using their assigned administrative or staff email address.
- **Department Roles**:
  - **Staff**: Manage incoming department complaints, update status flags, and post internal investigation notes.
  - **Department Admin**: Oversee departmental queues, review and approve official notices, and manage departmental workflows.
  - **Platform Admin**: Configure organizations, create departments, provision staff memberships, and inspect security audit logs.

---

## 📋 Core Workflows

### Manual Address Complaint Submission
1. Select the relevant service domain (Transport, Municipal, or Healthcare) and category.
2. Provide a descriptive title and detailed summary of the civic issue.
3. **Manual Location Entry**: Enter the street address, landmark, and locality manually. In accordance with platform privacy guidelines, no GPS or device geolocation APIs are utilized.
4. Optional: Attach photographic evidence.
5. Upon submission, an automated reference code (e.g., `#T-2024-0001`) is generated and the complaint is routed to the corresponding department.

### Complaint Life-Cycle & State Machine
Complaints follow a strict status progression:
- `submitted` → `triaged` → `in_progress` → `resolved` / `rejected`
- Citizens can reopen resolved complaints if the issue recurs or remains unsatisfied.
- Staff can record private internal notes that remain strictly invisible to the citizen.

### 4-Stage Document Publishing
Government circulars and citizen notices advance through an audit-backed approval workflow:
1. **Draft**: Authored by department staff.
2. **Review**: Submitted to departmental leadership for verification.
3. **Approved**: Formally authorized by a department or platform administrator.
4. **Published**: Rendered publicly on the Citizen Portal and public service pages.

---

## 🧪 Automated Testing

### Backend Test Suite (Pytest)
```bash
cd backend
python -m pytest -v
```
Validates:
- Citizen registration and dual-portal isolation.
- Complaint creation, reference generation, and automated routing.
- Cross-user ownership isolation (HTTP 404 response preventing record enumeration).
- State-machine status transitions and internal notes isolation.
- 4-stage document review and publication workflow.
- Cross-domain consent granting and revocation.

### Frontend Test Suite (Vitest)
```bash
cd frontend
npm run test
```
Validates core component rendering, design tokens, badges, stat cards, notices, and route access restriction views.

### Frontend Production Build
```bash
cd frontend
npm run build
```
Validates complete JSX/ES6 module syntax correctness, asset optimization, and stylesheet bundling.

---

## 🛡️ Security & Privacy Architecture

- **Address-Based Privacy**: No live coordinates, device tracking, or geolocation APIs.
- **Role-Based Access Control (RBAC)**: All permissions are enforced at the backend database query layer.
- **Audit Logging**: Security-critical events (logins, status changes, staff provisioning, consent changes) are immutably logged with actor IDs and timestamps.
- **Resilient AI Classification**: Incorporates automatic fallback to deterministic routing rules when external AI services are unavailable.
