# ⚡ UtilityLens

A modern, local-first web application designed to track, analyze, and optimize household utility consumption and expenditure across **Electricity**, **Natural Gas**, **Water**, **Council Tax**, **Broadband**, and **Estate Service Charges**.

Built with a **React 18 + Tailwind CSS + Recharts** frontend, a **Python FastAPI + Pandas + SQLAlchemy** analytics engine, and orchestrated with **Docker Compose**.

---

## 🌟 Key Features

1. **Dashboard & Cost Trends**:
   - **Monthly Spend Stacked Chart**: Visual breakdown of Electricity + Gas + Water + Council Tax + Broadband + Estate Service Charge spend over time with optional daily cost overlay.
   - **Consumption Volume Trends**: Energy in kWh (electricity & gas) plotted alongside water usage in m³.
   - **KPI Summary Cards**: Trailing 12-month spend, current month spend vs prior month (% MoM change), daily normalized average cost, and percentage share by utility.

2. **Seasonal & Heating Baseload Analysis**:
   - **YoY Comparison**: Compare calendar months across different years to track seasonal heating changes.
   - **Heating vs. Baseload Decomposition**: Decouples summer non-heating baseline (cooking, hot water, refrigeration, standby power) from winter temperature-driven space heating.

3. **"What-If" Tariff Simulator**:
   - Test potential fixed or variable tariffs (unit rates in p/kWh and standing charges in p/day).
   - Simulates your actual 12-month historical consumption against new rates and computes net savings (£ and %).

4. **Smart CSV Ingestion & Manual Entry**:
   - **Smart CSV Importer**: Auto-detects columns (`Date`, `Usage`, `Cost`, `Standing Charge`, `Utility`), provides a visual column-mapping interface, and previews rows before commit.
   - **UK Standing Charge Support**: Separates daily standing charge from usage/consumption costs across manual logging, tables, CSV import, and tariff simulations.
   - **Gas Meter Support**: Direct entry in $m^3$ with automatic conversion to standard UK calorific kWh ($m^3 \times 1.02264 \times 40.0 / 3.6$).
   - **Downloadable Sample CSV**: Template available with one click directly from the UI.
   - **Manual Loggers & In-Place Editing**: Quick modal forms for recording monthly statements with auto-calculation from active tariffs, plus dedicated in-place edit modals for bill records, physical meter readings, and tariff plans.

5. **Multi-Property & Frictionless Local Mode**:
   - No login or passwords required for local use.
   - Switch between multiple residences (e.g. *Main Home*, *Rental Property*, *Holiday Cottage*) from the navigation bar.

6. **1-Click Demo Data & Backup Import/Export**:
   - Pre-loaded with a 1-click realistic UK 18-month historical dataset for instant testing.
   - Single-click full JSON backup export.
   - Seamless JSON backup import and restore with Merge and Replace options.

---

## 🚀 Quick Start (Docker Compose)

### 1. Launch with One Command
```bash
docker compose up --build
```
*(or run `./start.sh`)*

### 2. Access the Application
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend & Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Environment Variables
You can customize options via `.env` (copy from `.env.example`):
- `VITE_ALLOWED_HOSTS` / `ALLOWED_HOSTS`: Configures Vite's `server.allowedHosts` for dev and preview servers. Set to `true` or `all` to allow all incoming host headers (useful behind reverse proxies, Tailscale, Cloudflare tunnels, or LAN IPs), or provide a comma-separated list of hostnames (e.g. `localhost,myhost.lan,utility.example.com`).
- `VITE_API_URL`: Backend proxy URL for Vite dev server (default: `http://backend:8000`).
- `DATABASE_URL`: SQLAlchemy SQLite database path (default: `sqlite:////app/data/utilities.db` in Docker).

---

## 📁 Project Structure

```
utility-lens/
├── backend/
│   ├── app/
│   │   ├── analytics.py        # Pandas/NumPy analytics, YoY, baseload, and simulator
│   │   ├── config.py           # Configuration & UK gas calorific defaults
│   │   ├── crud.py             # Database query operations
│   │   ├── database.py         # SQLAlchemy engine & session
│   │   ├── main.py             # FastAPI entrypoint & startup seed
│   │   ├── models.py           # SQLAlchemy models (Property, Tariff, Bill, MeterReading)
│   │   ├── schemas.py          # Pydantic v2 validation models
│   │   ├── seed_data.py        # 18-month realistic UK sample generator
│   │   └── routers/
│   │       ├── analytics.py    # Analytics endpoints
│   │       ├── bills.py        # Bill CRUD & auto-calculation
│   │       ├── data_io.py      # CSV preview/import, sample CSV, backup
│   │       ├── meter_readings.py # Meter reads CRUD
│   │       ├── properties.py   # Property switcher CRUD
│   │       └── tariffs.py      # Tariffs & unit rate CRUD
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   └── sample_utility_template.csv
│   ├── src/
│   │   ├── api/client.ts       # Typed API client
│   │   ├── components/
│   │   │   ├── Charts/         # Recharts components (Spend, Usage, YoY, Baseload)
│   │   │   ├── CSVImporter/    # Smart CSV upload & column mapper
│   │   │   ├── DataTable/      # Bill & meter reading tables
│   │   │   ├── Modals/         # Add bill, reading, tariff, property
│   │   │   ├── TariffSimulator/# What-If simulator
│   │   │   ├── KPICards.tsx
│   │   │   └── Navbar.tsx
│   │   ├── context/AppContext.tsx
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── start.sh
└── README.md
```

---

## 📊 CSV Import Format

When importing CSVs, you can use any custom column headers (the smart importer will auto-detect them and let you adjust mappings), or match the standard format:

| Period Start | Period End | Utility Type | Consumption | Total Cost (£) | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2025-01-01 | 2025-01-31 | ELECTRICITY | 320.5 | 89.40 | Monthly bill |
| 2025-01-01 | 2025-01-31 | GAS | 1850.0 | 131.25 | Winter heating |
| 2025-01-01 | 2025-01-31 | WATER | 9.5 | 29.11 | Metered supply |

---

## 🛠️ Testing & Development

### Frontend Typecheck & Build
```bash
cd frontend && npm install && npm run build
```

### Backend Direct Execution (Local Python)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
