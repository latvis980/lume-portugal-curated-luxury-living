# backend/main.py
"""
LUME by Mark — Website Backend

FastAPI application that:
1. Serves the React SPA (built by Vite into frontend/dist/)
2. Injects SEO data into every HTML response (meta tags, JSON-LD, hidden content)
3. Serves robots.txt, llms.txt, sitemap.xml at root level
4. Provides API endpoints for the CMS and public data

This is the exact same architecture pattern as ADU media (adu.media),
proven to work with Google indexing and LLM discoverability.

Usage:
    python backend/main.py

Environment Variables:
    PORT            - Server port (default: 8080)
    SITE_URL        - Public URL (default: https://lumebymark.com)
    SUPABASE_URL    - Supabase project URL
    SUPABASE_KEY    - Supabase API key
    R2_PUBLIC_URL   - Cloudflare R2 or image CDN URL
    IMAGE_BASE_URL  - Alternative image base URL (falls back to R2)
    ADMIN_PASSWORD  - Password for admin/CMS login
    JWT_SECRET      - Secret for JWT tokens
    DEBUG           - Enable API docs (true/false)
"""

import os
import sys
from pathlib import Path
from typing import Optional

# Make backend/ importable
sys.path.insert(0, str(Path(__file__).parent))

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse

from routes.public import router as public_router
from routes.admin import router as admin_router
from routes.public_forms import router as forms_router
from routes.translations import router as translations_router

from routes.public import robots, llms_txt, sitemap
from seo import inject_seo


# =============================================================================
# Application Setup
# =============================================================================

app = FastAPI(
    title="LUME by Mark API",
    description="Luxury real estate & lifestyle management in Portugal",
    version="1.0.0",
    docs_url="/api/docs" if os.getenv("DEBUG", "").lower() == "true" else None,
    redoc_url=None,
)


# =============================================================================
# CORS Configuration
# =============================================================================

cors_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [o.strip() for o in cors_env.split(",") if o.strip()] if cors_env else []

default_origins = [
    "http://localhost:5000",     # Vite dev server (Replit)
    "http://localhost:5173",     # Vite dev server (default)
    "http://localhost:3000",     # Alternative dev
    "http://localhost:8080",     # Local backend
]

site_url = os.getenv("SITE_URL", "")
if site_url:
    default_origins.append(site_url)
    # Also add www variant
    if "://" in site_url:
        scheme, rest = site_url.split("://", 1)
        if not rest.startswith("www."):
            default_origins.append(f"{scheme}://www.{rest}")

all_origins = list(set(cors_origins + default_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Include API Routers
# =============================================================================

app.include_router(public_router)
app.include_router(admin_router)
app.include_router(forms_router)
app.include_router(translations_router)
# TODO: Add these as you build them:
# app.include_router(webhook_router) # Supabase webhook handlers


# =============================================================================
# Health Check
# =============================================================================

@app.get("/api/health")
async def health_check():
    """Health check — used by Railway for deployment monitoring."""
    db_ok = False
    try:
        from database import test_connection
        db_ok = test_connection()
    except Exception:
        pass

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "version": "1.0.0",
    }


# =============================================================================
# Error Handlers
# =============================================================================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """
    Handle 404 errors.

    API routes → JSON error.
    All other routes → serve SPA with SEO injection (client-side routing).
    """
    if request.url.path.startswith("/api"):
        return JSONResponse(
            status_code=404,
            content={"detail": "Not found"},
        )

    # Serve SPA with SEO injection for client-side routing
    index_path = Path(__file__).parent.parent / "frontend" / "dist" / "index.html"
    if index_path.exists():
        template = _get_html_template()
        html = inject_seo(template, str(request.url.path))
        return HTMLResponse(content=html)

    return JSONResponse(
        status_code=404,
        content={"detail": "Not found"},
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# =============================================================================
# Static Files + SPA Serving (the SEO injection magic)
# =============================================================================

frontend_path = Path(__file__).parent.parent / "frontend" / "dist"

# Cache the HTML template in memory — read once, inject per-request
_html_template: Optional[str] = None


def _get_html_template() -> str:
    """Read and cache the index.html template."""
    global _html_template
    if _html_template is None:
        index_path = frontend_path / "index.html"
        _html_template = index_path.read_text(encoding="utf-8")
    return _html_template


if frontend_path.exists():
    # ── Mount static assets (JS, CSS, images) ──
    assets_path = frontend_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    # ── Root route: homepage with SEO injection ──
    @app.get("/")
    async def serve_root(request: Request):
        template = _get_html_template()
        html = inject_seo(template, "/")
        return HTMLResponse(content=html)

    # ── Root-level SEO & LLM files ──
    # These MUST be at root (not /api/) — crawlers only check root paths

    @app.get("/robots.txt")
    async def root_robots():
        return await robots()

    @app.get("/llms.txt")
    async def root_llms():
        return await llms_txt()

    @app.get("/sitemap.xml")
    async def root_sitemap():
        return await sitemap()

    # ── Catch-all: SPA routing with SEO injection ──
    @app.get("/{path:path}")
    async def serve_spa(request: Request, path: str):
        # Serve actual static files directly (JS bundles, images, etc.)
        file_path = frontend_path / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # Everything else: inject SEO into the SPA template
        template = _get_html_template()
        html = inject_seo(template, str(request.url.path))
        return HTMLResponse(content=html)

else:
    # No frontend built yet — API-only mode
    @app.get("/")
    async def no_frontend():
        return JSONResponse({
            "message": "LUME by Mark API is running",
            "api_docs": "/api/docs" if os.getenv("DEBUG") else None,
            "health": "/api/health",
            "note": "Frontend not built. Run 'cd frontend && npm run build' first.",
        })


# =============================================================================
# Entry Point
# =============================================================================

def main():
    port = int(os.getenv("PORT", "8080"))
    debug = os.getenv("DEBUG", "").lower() == "true"

    print()
    print("  LUME by Mark — Backend")
    print("  ========================")
    print(f"  Port: {port}")
    print(f"  Debug: {debug}")
    print(f"  Frontend: {'Found' if frontend_path.exists() else 'Not built'}")
    print(f"  Site URL: {os.getenv('SITE_URL', 'not set')}")
    print()

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=debug,
    )


if __name__ == "__main__":
    main()
