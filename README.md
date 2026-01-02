# 🚀 Reddit Ops Console - Market Validation Toolkit

A **premium, local-first** market research and problem discovery platform. Find real user problems, analyze opportunities with AI, validate with multi-source market signals, and discover your next product idea.

![Dashboard](https://img.shields.io/badge/Dashboard-Next.js_16-black?style=flat-square&logo=nextdotjs)
![UI](https://img.shields.io/badge/UI-Shadcn-000000?style=flat-square&logo=shadcnui)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql)
![AI](https://img.shields.io/badge/AI-OpenRouter-8B5CF6?style=flat-square)

---

## ✨ What It Does

| Feature | Description |
|---------|-------------|
| 🔍 **Problem Discovery** | Search Reddit, HackerNews, Twitter, ProductHunt, G2, Capterra for user pain points |
| 🤖 **AI Analysis** | Score opportunities 1-10, extract JTBD, identify target audiences |
| 📊 **Multi-Source Validation** | Validate ideas with Jobs, News, Social, and E-commerce signals via Apify |
| 📈 **Analytics Dashboard** | Visualize trends, platform breakdowns, score distributions |
| 📁 **Collections** | Save & organize promising problems into collections |
| 📧 **Weekly Digests** | Email summaries of top opportunities (via Resend) |
| 📤 **Export** | CSV, JSON, PDF-ready HTML reports |
| 🔔 **Real-time Updates** | WebSocket notifications for job completions |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Frontend (Next.js 16 + React 19 + Shadcn/UI)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │ Discover │ │Analytics │ │Opportun- │ ...       │
│  │          │ │          │ │          │ │  ities   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                    ↓ HTTP/WebSocket                              │
├─────────────────────────────────────────────────────────────────┤
│                     Backend (FastAPI + SQLAlchemy)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Discovery │ │  Data    │ │Analytics │ │ Exports  │           │
│  │  Routes  │ │Providers │ │  Routes  │ │  Routes  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                    ↓                                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  PostgreSQL DB   │  │  External APIs   │                     │
│  │  (or SQLite)     │  │ Apify, OpenRouter│                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Python** | 3.11+ | Tested with 3.13 |
| **Node.js** | 18+ | Tested with 20.x |
| **PostgreSQL** | 14+ | Recommended for production |
| **npm** or **pnpm** | Latest | Package manager |

### Required API Keys
- **Apify API Token** - For problem discovery and multi-source validation
- **OpenRouter API Key** - For AI-powered opportunity analysis

### Optional
- **Resend API Key** - For sending weekly digest emails

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/reddit-ops-console.git
cd reddit-ops-console
```

### 2. Start PostgreSQL Database

Using Docker (easiest):
```bash
docker run -d \
  --name reddit-ops-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=reddit_ops \
  -p 5432:5432 \
  postgres:14
```

Or use an existing PostgreSQL installation and create the database:
```sql
CREATE DATABASE reddit_ops;
```

### 3. Setup Backend

```bash
# Navigate to backend
cd apps/backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate   # On macOS/Linux
# .venv\Scripts\activate    # On Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp ../../.env.example .env

# Edit .env with your configuration (see Environment Variables section)
```

### 4. Setup Frontend

```bash
# Navigate to frontend (from project root)
cd apps/frontend

# Install dependencies
npm install
```

### 5. Configure Environment Variables

Edit `apps/backend/.env`:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:postgres123@localhost:5432/reddit_ops

# Required: Apify for problem discovery & multi-source validation
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxx

# Required: OpenRouter for AI analysis
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# Optional: Email digests
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=insights@yourdomain.com
```

### 6. Start the Application

**Terminal 1 - Backend:**
```bash
cd apps/backend
./dev.sh
```

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
./dev.sh
```

> **⚠️ Important:** Always use `Ctrl+C` to stop servers. Never use `Ctrl+Z` (which suspends processes and causes issues).

### 7. Open the Dashboard

Navigate to **http://localhost:3000** in your browser.

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `APIFY_API_TOKEN` | Yes | - | Apify token for discovery & multi-source |
| `OPENROUTER_API_KEY` | Yes | - | OpenRouter key for AI analysis |
| `RESEND_API_KEY` | No | - | Resend key for email digests |
| `RESEND_FROM_EMAIL` | No | - | Sender email address |
| `DEBUG` | No | `false` | Enable debug mode |

### Database URL Formats

**PostgreSQL (Recommended):**
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/reddit_ops
```

**SQLite (Development only):**
```
DATABASE_URL=sqlite+aiosqlite:///./data/reddit_ops.db
```

---

## 🌐 API Endpoints

### Core Discovery

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/discovery/platforms` | GET | List available platforms |
| `/discovery/keywords` | GET | Get default search keywords |
| `/discovery/search` | POST | Run a new problem search |
| `/discovery/problems` | GET | List discovered problems |
| `/discovery/problems/{id}/analyze` | POST | AI-analyze a problem |

### Multi-Source Validation (NEW)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/discovery/providers/status` | GET | Check data provider configuration |
| `/discovery/problems/{id}/enrich-multi` | POST | Fetch signals from Jobs, News, Social |
| `/discovery/signals/{id}` | GET | Get market signals for a problem |

### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analytics/dashboard` | GET | Full dashboard data |
| `/analytics/platform-comparison` | GET | Platform trends |
| `/analytics/score-trends` | GET | Score history |

### Collections & Exports

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/collections` | GET/POST | List/create collections |
| `/exports/discovery/export` | POST | Export to CSV/JSON |
| `/exports/discovery/pdf` | GET | PDF-ready download |

---

## 📁 Project Structure

```
reddit-ops-console/
├── apps/
│   ├── backend/                  # FastAPI Backend
│   │   ├── .venv/                # Python virtual environment (create locally)
│   │   ├── main.py               # App entry point
│   │   ├── requirements.txt      # Python dependencies
│   │   │
│   │   ├── backend_api/          # API Routes
│   │   │   └── routes/
│   │   │       ├── discovery.py  # Problem discovery + multi-source
│   │   │       ├── analytics.py  # Dashboard analytics
│   │   │       ├── collections.py
│   │   │       ├── digest.py
│   │   │       └── exports.py
│   │   │
│   │   ├── backend_core/         # Business logic
│   │   │   ├── apify_service.py  # Google Search scraping
│   │   │   ├── ai_enrichment.py  # OpenRouter AI integration
│   │   │   └── email_service.py  # Resend integration
│   │   │
│   │   ├── data_providers/       # Multi-source validation (NEW)
│   │   │   ├── base.py           # DataProviderManager
│   │   │   ├── apify_client.py   # Apify wrapper with caching
│   │   │   ├── jobs.py           # LinkedIn, Indeed, Adzuna
│   │   │   ├── news.py           # Google News, RSS, Product Hunt
│   │   │   └── social.py         # Twitter, YouTube, TikTok, Instagram
│   │   │
│   │   └── backend_db/           # Database models
│   │       ├── database.py       # Connection & pooling
│   │       ├── models.py         # Base models
│   │       └── discovery_models.py # Problems, Insights, Signals
│   │
│   └── frontend/                 # Next.js Frontend
│       ├── app/                  # App Router pages
│       │   ├── page.tsx          # Dashboard
│       │   ├── discover/         # Problem discovery
│       │   ├── opportunities/    # Opportunity details + signals
│       │   ├── analytics/        # Analytics page
│       │   └── settings/         # Settings page
│       │
│       ├── components/           # React components
│       │   ├── charts/           # Recharts visualizations
│       │   ├── collections/      # Collection management
│       │   ├── signals/          # Market Signals UI (NEW)
│       │   └── layout/           # Navigation, sidebar
│       │
│       └── hooks/                # Custom React hooks
│           └── useOpportunities.ts
│
├── .env.example                  # Environment template
├── docker-compose.yml            # Docker setup
└── README.md                     # This file
```

---

## 🔧 Database Management

### Auto-Migration

Tables are created automatically on first startup. The backend checks for existing tables and creates any missing ones.

### Manual Database Reset

```bash
# PostgreSQL
psql -U postgres -c "DROP DATABASE reddit_ops; CREATE DATABASE reddit_ops;"

# SQLite
rm apps/backend/data/reddit_ops.db

# Restart backend - tables recreate automatically
```

### Key Tables

| Table | Description |
|-------|-------------|
| `discovered_problems` | Found user problems |
| `problem_insights` | AI analysis results |
| `market_signals` | Multi-source validation signals (NEW) |
| `multi_source_validations` | Aggregated confidence scores (NEW) |
| `problem_collections` | User collections |
| `digest_settings` | Email digest preferences |

---

## 🐛 Troubleshooting

### Backend won't start / Module not found errors

**Cause:** Virtual environment not activated or dependencies not installed.

**Fix:**
```bash
cd apps/backend
source .venv/bin/activate
pip install -r requirements.txt
.venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### "pydantic_settings not found" error

**Cause:** Using system Python instead of virtual environment.

**Fix:**
```bash
cd apps/backend
# Use full path to venv Python
.venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Database connection refused

**Cause:** PostgreSQL not running.

**Fix:**
```bash
# Using Docker
docker start reddit-ops-db

# Or check if running
docker ps | grep postgres
```

### "Address already in use" when starting backend

**Fix:**
```bash
lsof -ti :8000 | xargs kill -9
# Wait 3 seconds, then start again
```

### Frontend blank page / CORS errors

**Cause:** Backend not running or on wrong port.

**Fix:**
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check frontend `.env.local` has correct API URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

### Multi-source enrichment returns 0 signals

**Cause:** Some Apify actors require paid rental.

**Info:** Free-tier working actors: Indeed Jobs, TikTok Trends, Instagram Posts. Google News, LinkedIn require rental.

### Backend becomes unresponsive / hangs

**Cause:** Process was suspended with `Ctrl+Z` instead of stopped with `Ctrl+C`.

**Fix:**
```bash
# From project root, run the reset script
./project-reset.sh

# Then restart services
cd apps/backend && ./dev.sh
cd apps/frontend && ./dev.sh
```

> **Prevention:** Always use `Ctrl+C` to stop servers. Never use `Ctrl+Z`.

---

## 📊 Multi-Source Validation

### How It Works

1. Find a problem opportunity in the Discover page
2. Click to open details sidebar
3. Scroll to "Multi-Source Market Signals" section
4. Click "Fetch Market Signals"
5. System queries 10 data providers via Apify
6. Results show confidence score + signals by type

### Data Providers

| Type | Providers | Signal |
|------|-----------|--------|
| **Jobs** | LinkedIn, Indeed, Adzuna | Hiring demand = market need |
| **News** | Google News, RSS, Product Hunt | Media coverage = trend |
| **Social** | Twitter, YouTube, TikTok, Instagram | User discussions = pain |

### Confidence Score

Weighted algorithm:
- Jobs signals: 30%
- News signals: 25%
- Social signals: 25%
- Developer signals: 10%
- E-commerce signals: 10%

---

## 🔗 External Services

### Apify (Required)

1. Create account at https://apify.com
2. Get API token from Settings → Integrations
3. Cost: ~$0.50 / 1000 search results
4. Some actors require monthly rental ($5-50/mo)

### OpenRouter (Required)

1. Create account at https://openrouter.ai
2. Add credits and get API key
3. Uses Claude by default (~$0.003 per analysis)

### Resend (Optional)

1. Create account at https://resend.com
2. Get API key from dashboard
3. Free tier: 100 emails/day

---

## 📜 License

MIT License - Feel free to use, modify, and distribute.

---

Built with ❤️ for indie hackers and product builders.
