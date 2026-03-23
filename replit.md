# Project Overview

A full-stack application with a React + TypeScript frontend and a Python (FastAPI) backend.

## Architecture

```
/
├── frontend/     React + Vite + TypeScript + shadcn/ui
└── backend/      Python FastAPI REST API
```

## Tech Stack

### Frontend (`frontend/`)
- **Framework**: React 18, TypeScript, Vite 8
- **Styling**: Tailwind CSS, shadcn/ui (Radix UI primitives)
- **Routing**: React Router v6
- **State/Data**: TanStack React Query
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Animations**: Framer Motion

### Backend (`backend/`)
- **Framework**: FastAPI (Python 3.11)
- **Server**: Uvicorn (with hot reload in dev)
- **API prefix**: All routes use `/api/...`

## Running the App

Two workflows run in parallel:

| Workflow | Command | Port |
|---|---|---|
| Start application | `cd frontend && npm run dev` | 5000 (webview) |
| Backend API | `cd backend && uvicorn main:app --reload` | 8000 (console) |

The Vite dev server proxies `/api/*` requests from port 5000 → 8000, so the frontend can call `/api/...` and it reaches the backend automatically.

## Key Files

- `frontend/src/App.tsx` — Root component with routes
- `frontend/src/pages/` — Page-level components
- `frontend/src/components/` — Reusable UI components (shadcn/ui + custom)
- `frontend/vite.config.ts` — Vite config including proxy setup
- `backend/main.py` — FastAPI application entry point
- `backend/requirements.txt` — Python dependencies

## Development Notes

- Frontend API calls should use relative `/api/...` paths (proxied to backend by Vite in dev)
- All backend routes must be prefixed with `/api`
- `allowedHosts: true` is set in Vite for Replit's proxied preview pane
