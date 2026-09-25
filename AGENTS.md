# 🤖 AGENTS.md — AI Agent Operating Manual & Architecture Guide

Welcome to **UtilityLens (Home Utility Analysis)**. This repository is an end-to-end, local-first web application designed to track, analyze, and optimize household utility consumption and expenditure across **Electricity**, **Natural Gas**, and **Water**.

This document serves as the single source of truth for AI agents (and human developers) inspecting, modifying, or extending this codebase. Follow the conventions, business rules, and patterns outlined below.

---

## 📑 Table of Contents
1. [Core Capabilities & Domain Context](#-core-capabilities--domain-context)
2. [Tech Stack Overview](#-tech-stack-overview)
3. [Repository Structure](#-repository-structure)
4. [Environment Setup & Common Commands](#-environment-setup--common-commands)
5. [Data Models & Database Schema](#-data-models--database-schema)
6. [Critical Domain Rules & Calculation Logic](#-critical-domain-rules--calculation-logic)
7. [API Contract & Endpoints](#-api-contract--endpoints)
8. [Frontend Architecture & UI Guidelines](#-frontend-architecture--ui-guidelines)
9. [Rules & Conventions for AI Agents](#-rules--conventions-for-ai-agents)

---

## 🌟 Core Capabilities & Domain Context

- **Local-First & Frictionless**: Designed to run locally with zero user authentication requirements, storing data in SQLite by default.
- **Multi-Property Scoping**: Multiple properties/residences (e.g. *Main Home*, *Holiday Cottage*) can be managed, with all bills, readings, and tariffs scoped to a `property_id`.
- **UK Utility Market Nuances**:
  - **Standing Charge Separation**: Domestic UK utility bills comprise a daily fixed standing charge (in pence/day or £/day) plus volumetric usage charges. UtilityLens breaks out standing charges across data logging, CSV imports, charts, and simulations.
  - **Gas Calorific Conversion**: Gas meters record volumetric flow ($m^3$ or imperial 100 cu ft). In the UK, billing uses standard calorific conversion to kWh ($m^3 \times 1.02264 \times 40.0 / 3.6 \approx 11.3626$).
  - **Domestic VAT**: Typically 5% for UK residential energy (configurable per tariff).
- **Seasonal & Baseload Decomposition**: Decouples summer non-heating baseline (cooking, hot water, refrigeration, standby power) from winter temperature-driven space heating.
- **"What-If" Tariff Simulator**: Computes net savings by testing hypothetical unit rates and standing charges against 12-month historical consumption.
- **Smart CSV Ingestion**: Heuristic column mapping, format preview, automatic tariff rate fallback, and gas $m^3 \to \text{kWh}$ conversion.
- **Full Backup / Restore**: JSON export/import with both `merge` (deduplicating) and `replace` (clean wipe) modes.

---

## 💻 Tech Stack Overview

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2 (validation), Pandas & NumPy (analytics), Python-Dateutil |
| **Database** | SQLite (default: `sqlite:////app/data/utilities.db` in Docker, `sqlite:///./utilities.db` locally) |
| **Frontend** | React 18, TypeScript 5, Vite, Tailwind CSS 3, Recharts, Lucide React |
| **Orchestration** | Docker Compose (`backend:8000`, `frontend:5173`) |

---

## 📁 Repository Structure

```
home-utility-analysis/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py           # Pydantic Settings & gas calorific constants
│   │   ├── database.py         # SQLAlchemy engine, session maker, Base, get_db
│   │   ├── models.py           # SQLAlchemy ORM models (Property, TariffPlan, BillRecord, etc.)
│   │   ├── schemas.py          # Pydantic v2 schemas (Create, Update, Response models)
│   │   ├── crud.py             # Database query operations and state persistence
│   │   ├── analytics.py        # Pandas/NumPy analytics (KPIs, monthly breakdown, YoY, baseload, simulator)
│   │   ├── seed_data.py        # 18-month realistic UK historical data generator
│   │   ├── main.py             # FastAPI app initialization, middleware, lifecycle & routing
│   │   └── routers/
│   │       ├── properties.py   # Property switcher CRUD (/api/properties)
│   │       ├── tariffs.py      # Tariffs & unit rate CRUD (/api/tariffs)
│   │       ├── bills.py        # Bill records CRUD & auto-calculation (/api/bills)
│   │       ├── meter_readings.py # Physical meter reads CRUD (/api/meter-readings)
│   │       ├── analytics.py    # Analytical metrics endpoints (/api/analytics)
│   │       └── data_io.py      # CSV preview/commit, sample CSV, backup JSON (/api/data-io)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   └── sample_utility_template.csv
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts       # Typed fetch API client
│   │   ├── components/
│   │   │   ├── Charts/
│   │   │   │   ├── BaseloadChart.tsx
│   │   │   │   ├── SpendTrendChart.tsx
│   │   │   │   ├── UsageTrendChart.tsx
│   │   │   │   └── YoYComparisonChart.tsx
│   │   │   ├── CSVImporter/
│   │   │   │   └── CSVImporterModal.tsx
│   │   │   ├── DataTable/
│   │   │   │   ├── BillTable.tsx
│   │   │   │   └── MeterReadingTable.tsx
│   │   │   ├── Modals/
│   │   │   │   ├── AddBillModal.tsx
│   │   │   │   ├── EditBillModal.tsx
│   │   │   │   ├── AddMeterReadingModal.tsx
│   │   │   │   ├── EditMeterReadingModal.tsx
│   │   │   │   ├── ImportBackupModal.tsx
│   │   │   │   ├── PropertyModal.tsx
│   │   │   │   └── TariffModal.tsx
│   │   │   ├── TariffSimulator/
│   │   │   │   └── TariffSimulator.tsx
│   │   │   ├── KPICards.tsx
│   │   │   └── Navbar.tsx
│   │   ├── context/
│   │   │   └── AppContext.tsx  # Central state: current property, dark mode, active tab, refresh trigger
│   │   ├── types/
│   │   │   └── index.ts        # Shared TypeScript interfaces & types
│   │   ├── App.tsx             # Root component & tab layout
│   │   ├── index.css           # Tailwind directives & theme definitions
│   │   └── main.tsx            # React DOM mounting
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts          # Vite configuration with /api proxy to backend
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── start.sh
├── README.md
└── AGENTS.md                   # This file
```

---

## 🛠️ Environment Setup & Common Commands

### 1. Launch via Docker Compose (Recommended)
```bash
docker compose up --build
```
- **Frontend Dashboard**: `http://localhost:5173`
- **FastAPI OpenAPI Swagger**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

### 2. Running Standalone for Local Development

#### Backend (Python):
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend (Node):
```bash
cd frontend
npm install
npm run dev
```

### 3. Typechecking & Verification
Always verify TypeScript compilation after modifying frontend files:
```bash
# From repository root:
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit

# Or inside frontend/:
./node_modules/.bin/tsc --noEmit
```

> [!NOTE]
> When building inside Docker, files created in `frontend/dist` may be owned by `root`. If running `npm run build` directly on the host encounters permission issues with `frontend/dist/assets`, use `./node_modules/.bin/tsc --noEmit` to verify type safety without touching the build artifacts.

### 4. Direct API Health Verification
```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/api/properties
```

---

## 🗄️ Data Models & Database Schema

All database models use SQLAlchemy declarative base in `backend/app/models.py`.

### 1. `Property` (`properties`)
- `id`: UUID string (Primary Key)
- `name`: string (e.g. `"Main Home"`)
- `address`: string (nullable)
- `currency_symbol`: string (default `"£"`)
- `created_at`: DateTime
- *Relationships*: `bills`, `meter_readings`, `tariffs`, `accounts` (all with `cascade="all, delete-orphan"`).

### 2. `TariffPlan` (`tariff_plans`)
- `id`: UUID string (Primary Key)
- `property_id`: ForeignKey(`properties.id`, cascade on delete)
- `utility_type`: string (`"ELECTRICITY"`, `"GAS"`, `"WATER"`, `"COUNCIL_TAX"`, `"BROADBAND"`, `"ESTATE_SERVICE_CHARGE"`)
- `name`: string (e.g. `"Octopus Flexible Electric"`)
- `valid_from`: Date (inclusive start)
- `valid_to`: Date (nullable end)
- `unit_rate`: float (£ per kWh or £ per $m^3$)
- `standing_charge`: float (£ per day)
- `vat_rate`: float (default `0.05` for 5% UK domestic VAT, `0.0` for Water/Council Tax/Service Charge, `0.20` for Broadband)
- `is_active`: boolean (default `True`)

### 3. `BillRecord` (`bill_records`)
- `id`: UUID string (Primary Key)
- `property_id`: ForeignKey(`properties.id`, cascade on delete)
- `utility_type`: string (`"ELECTRICITY"`, `"GAS"`, `"WATER"`, `"COUNCIL_TAX"`, `"BROADBAND"`, `"ESTATE_SERVICE_CHARGE"`)
- `period_start`: Date
- `period_end`: Date
- `total_units`: float (Standardized: kWh for electricity & gas; $m^3$ for water; 0.0 for fixed services)
- `raw_meter_units`: float (nullable; original reading before conversion, e.g. $m^3$ gas)
- `raw_unit_type`: string (nullable; `"M3"`, `"KWH"`)
- `total_cost`: float (total statement amount)
- `standing_charge_cost`: float (nullable; separated fixed daily charge cost)
- `unit_rate_cost`: float (nullable; separated consumption cost)
- `notes`: text
- `source`: string (`"MANUAL"`, `"CSV_IMPORT"`, `"SEED_DATA"`, `"JSON_IMPORT"`)

### 4. `MeterReading` (`meter_readings`)
- `id`: UUID string (Primary Key)
- `property_id`: ForeignKey(`properties.id`, cascade on delete)
- `utility_type`: string (`"ELECTRICITY"`, `"GAS"`, `"WATER"`)
- `reading_date`: Date
- `meter_index`: float (cumulative dial index)
- `meter_unit`: string (`"KWH"`, `"M3"`)
- `reading_type`: string (`"ACTUAL"`, `"ESTIMATED"`, `"SMART"`)
- `notes`: text

---

## 📐 Critical Domain Rules & Calculation Logic

### 1. UK Gas Calorific Value Conversion
Gas meters measure volume ($m^3$). Energy suppliers bill in kWh using the UK formula:
$$\text{kWh} = \text{volume}(m^3) \times \text{Volume Correction (1.02264)} \times \frac{\text{Calorific Value (40.0)}}{\text{Conversion Factor (3.6)}} \approx m^3 \times 11.3626$$
- When recording a gas bill with $m^3$, store $m^3$ in `raw_meter_units`, set `raw_unit_type="M3"`, and store the calculated kWh in `total_units`.
- Analytics (`analytics.py`) always operates on standardized `total_units` (kWh for Electricity and Gas, $m^3$ for Water).

### 2. Standing Charge & Unit Rate Cost Reconciliation
For any bill spanning $N = \max(1, \text{period\_end} - \text{period\_start})$ days:
- $\text{Total Cost} = \text{Standing Charge Cost} + \text{Unit Rate Cost}$
- **Reconciliation Rules (`bills.py`, `data_io.py`)**:
  - If `standing_charge_cost` and `unit_rate_cost` are provided and `total_cost` is 0 or omitted:
    $$\text{total\_cost} = \text{standing\_charge\_cost} + \text{unit\_rate\_cost}$$
  - If `total_cost` and `standing_charge_cost` are provided but `unit_rate_cost` is missing:
    $$\text{unit\_rate\_cost} = \max(0.0, \text{total\_cost} - \text{standing\_charge\_cost})$$
  - If `total_cost` and `unit_rate_cost` are provided but `standing_charge_cost` is missing:
    $$\text{standing\_charge\_cost} = \max(0.0, \text{total\_cost} - \text{unit\_rate\_cost})$$
  - If `total_cost` is 0 or omitted, auto-derive from the active tariff:
    $$\text{unit\_cost} = \text{units} \times \text{unit\_rate} \times (1 + \text{vat})$$
    $$\text{sc\_cost} = N \times \text{standing\_charge} \times (1 + \text{vat})$$
    $$\text{total\_cost} = \text{unit\_cost} + \text{sc\_cost}$$

### 3. Baseload vs. Space Heating Decomposition
In `backend/app/analytics.py`:
- **Gas**: Summer months (June, July, August) indicate the non-heating baseload (hot water, cooking). Winter months (December, January, February) represent heating peak.
  $$\text{Heating Share \%} = \frac{\text{Winter Peak} - \text{Summer Baseline}}{\text{Winter Peak}} \times 100$$
- **Electricity**: Minimum recorded monthly consumption represents the continuous non-seasonal electrical draw (refrigeration, standby devices, constant base load).

### 4. What-If Tariff Simulation Engine
In `backend/app/analytics.py`:
- Analyzes actual consumption for the selected lookback window (default 12 months).
- For each utility scenario provided:
  $$\text{Simulated Cost} = [\text{historical\_units} \times \text{new\_unit\_rate} + \text{total\_days} \times \text{new\_standing\_charge}] \times (1 + \text{vat\_rate})$$
  $$\text{Savings} = \text{Historical Actual Cost} - \text{Simulated Cost}$$
  $$\text{Savings \%} = \frac{\text{Savings}}{\text{Historical Actual Cost}} \times 100$$

### 5. Smart CSV Ingestion
- Heuristically recognizes headers for:
  - `date_col`: `"start date"`, `"period start"`, `"bill date"`, `"date"`, etc.
  - `end_date_col`: `"end date"`, `"period end"`, `"to"`, etc.
  - `utility_type_col`: `"utility"`, `"fuel"`, `"type"`, etc.
  - `usage_col`: `"usage"`, `"consumption"`, `"kwh"`, `"units"`, `"m3"`, etc.
  - `cost_col`: `"total cost"`, `"amount"`, `"spend"`, `"bill"`, etc.
  - `standing_charge_col`: `"standing charge"`, `"daily charge"`, `"standing"`, etc.
- Parses dates flexibly using `dateutil.parser`.
- If single-utility CSV is uploaded, user can assign `default_utility_type`.

### 6. Backup & Restore Deduplication Keys
When importing backups in `merge` mode:
- **Tariffs deduplication key**: `(utility_type, name, str(valid_from))`
- **Bills deduplication key**: `(utility_type, str(period_start), str(period_end))`
- **Meter readings deduplication key**: `(utility_type, str(reading_date))`

---

## 🌐 API Contract & Endpoints

| Group | Method | Path | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/health` | Health status and service identifier |
| **Properties** | `GET` | `/api/properties` | List all properties (auto-seeds demo if empty) |
| | `POST` | `/api/properties` | Create a new property |
| | `GET` | `/api/properties/{id}` | Get property by ID |
| | `PUT` | `/api/properties/{id}` | Update property details |
| | `DELETE`| `/api/properties/{id}` | Delete property (cascades to bills/tariffs) |
| **Tariffs** | `GET` | `/api/tariffs?property_id={id}&utility_type={type}` | List tariffs for a property |
| | `GET` | `/api/tariffs/active?property_id={id}&utility_type={type}` | Get currently active tariff |
| | `POST` | `/api/tariffs` | Create new tariff plan |
| | `GET` | `/api/tariffs/{id}` | Get tariff by ID |
| | `PUT` | `/api/tariffs/{id}` | Update tariff plan |
| | `DELETE`| `/api/tariffs/{id}` | Delete tariff plan |
| **Bills** | `GET` | `/api/bills?property_id={id}&utility_type={type}` | List historical bills |
| | `POST` | `/api/bills` | Record statement (with auto-cost & gas $m^3$ handling) |
| | `GET` | `/api/bills/{id}` | Get bill by ID |
| | `PUT` | `/api/bills/{id}` | Update bill record with cost reconciliation |
| | `DELETE`| `/api/bills/{id}` | Delete bill record |
| **Meter Readings** | `GET` | `/api/meter-readings?property_id={id}` | List meter readings |
| | `POST` | `/api/meter-readings` | Log physical meter reading |
| | `GET` | `/api/meter-readings/{id}` | Get meter reading by ID |
| | `PUT` | `/api/meter-readings/{id}` | Update meter reading |
| | `DELETE`| `/api/meter-readings/{id}` | Delete meter reading |
| **Analytics** | `GET` | `/api/analytics/kpis?property_id={id}&property_ids={id}` | Trailing 12m spend, current/prev month MoM %, daily average (supports single, comma-separated, or multi-property aggregation; defaults to all) |
| | `GET` | `/api/analytics/monthly-breakdown?property_id={id}&months_lookback={n}` | Monthly stacked spend and usage breakdown (supports single or multi-property portfolio) |
| | `GET` | `/api/analytics/yoy-comparison?property_id={id}&year_current={y1}&year_previous={y2}` | Calendar month YoY comparison across selected properties |
| | `GET` | `/api/analytics/baseload?property_id={id}` | Space heating vs non-heating baseload decomposition (supports multi-property) |
| | `POST` | `/api/analytics/simulate-tariffs` | Run what-if simulation against historical consumption (supports single or multi-property) |
| **Data I/O** | `POST` | `/api/data-io/preview-csv` | Upload CSV and get auto-detected headers and sample rows |
| | `POST` | `/api/data-io/commit-csv` | Import CSV with column mappings and gas conversions |
| | `GET` | `/api/data-io/sample-csv` | Download sample CSV template |
| | `POST` | `/api/data-io/seed-demo` | Reset or seed 18-month realistic UK historical dataset |
| | `GET` | `/api/data-io/export-backup` | Export all properties, tariffs, bills, and readings to JSON |
| | `POST` | `/api/data-io/import-backup?mode=merge|replace` | Import JSON backup file |

---

## 🎨 Frontend Architecture & UI Guidelines

### 1. Navigation & State Management
- **`AppContext` (`frontend/src/context/AppContext.tsx`)**:
  - `currentProperty`: The active property selected for data entry (adding bills, tariffs, readings).
  - `selectedPropertyIds`: Array of property IDs selected for household analytics, defaulting to all properties.
  - `properties`: List of available properties.
  - `selectAllProperties()` & `togglePropertySelection(id)`: Multi-property analysis filtering.
  - `activeTab`: `'dashboard' | 'bills' | 'readings' | 'simulator' | 'baseload'`.
  - `refreshKey` & `triggerRefresh()`: Triggers re-fetching across active views.
  - `isDarkMode` & `toggleDarkMode()`: Controls dark mode via document root class `'dark'` and `localStorage`.

### 2. Color Palettes by Utility
Maintain consistent visual semantics across tables, badges, and charts:
- **Electricity**: Amber / Yellow (`text-amber-500`, `bg-amber-500/10`, stroke `#f59e0b`). Icon: `<Zap />`.
- **Gas**: Orange / Red / Flame (`text-orange-500`, `bg-orange-500/10`, stroke `#ef4444` / `#f97316`). Icon: `<Flame />`.
- **Water**: Cyan / Blue / Droplets (`text-cyan-500`, `bg-cyan-500/10`, stroke `#06b6d4`). Icon: `<Droplets />`.
- **Council Tax**: Purple / Violet (`text-purple-500`, `bg-purple-500/10`, stroke `#8b5cf6`). Icon: `<Landmark />`.
- **Broadband**: Emerald / Green (`text-emerald-500`, `bg-emerald-500/10`, stroke `#10b981`). Icon: `<Wifi />`.
- **Estate Service Charge**: Pink / Rose (`text-pink-500`, `bg-pink-500/10`, stroke `#ec4899`). Icon: `<ShieldCheck />`.

### 3. Modal Architecture
- Modal components reside in `frontend/src/components/Modals/` and `frontend/src/components/CSVImporter/`.
- Every modal exposes `isOpen: boolean` and `onClose: () => void`.
- When an entity is created or edited, always invoke `triggerRefresh()` from `useApp()` to invalidate dependent queries.

---

## 🤖 Rules & Conventions for AI Agents

When working on this repository, strictly adhere to these practices:

1. **Git & Branching Workflow (Strict)**:
   - **Never make changes directly to the `main` branch.**
   - **Create a feature / bugfix branch for each feature or bugfix** (e.g., `feature/<name>` or `bugfix/<name>`).
   - **Always make a commit for each change** with a clear, conventional commit message.
   - **Always drop (delete) the feature / bugfix branch after it is merged to `main`** (e.g., `git branch -d <branch-name>`).

2. **Full-Stack Schema Synchronization**:
   Whenever a database model column is added or modified:
   - Update SQLAlchemy model in `backend/app/models.py`.
   - Update Pydantic schemas in `backend/app/schemas.py` (`Base`, `Create`, `Update`, `Response`).
   - Update TypeScript interfaces in `frontend/src/types/index.ts`.
   - Update frontend form modals (`Modals/`) and data tables (`DataTable/`).
   - Update backup import/export serializers in `backend/app/routers/data_io.py`.

3. **Pydantic v2 Best Practices**:
   - Use `model.model_dump()` instead of deprecated `model.dict()`.
   - Use `model.model_dump(exclude_unset=True)` for partial updates.
   - Use `model_config = ConfigDict(from_attributes=True)` or `class Config: from_attributes = True` for ORM serialization.

4. **Standing Charge Integrity**:
   - Never collapse daily standing charges into consumption unit rates.
   - Always allow users to log or adjust standing charges independently.
   - Always compute daily averages by dividing by actual days in the period/month (`calendar.monthrange`).

5. **Multi-Property Scoping**:
   - Every bill, reading, and tariff query **must** filter by `property_id`.
   - Never leak records across properties in analytics or table views.

6. **Type Safety Verification**:
   - After modifying TypeScript files, run `./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit` and resolve any compiler diagnostics.

7. **Dark Mode & Styling**:
   - Ensure all new components support dark mode using Tailwind `dark:` variant classes (e.g. `bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100`).
   - Retain clean typography, rounded corners (`rounded-xl` or `rounded-lg`), and subtle borders (`border-slate-200 dark:border-slate-800`).
