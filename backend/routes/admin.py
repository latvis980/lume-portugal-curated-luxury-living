# backend/routes/admin.py
"""
Admin / CMS routes for LUME by Mark.

All routes are prefixed with /api/admin and require JWT authentication
(except the login endpoint).

Endpoints:
    POST   /api/admin/login              — Authenticate and get JWT token
    GET    /api/admin/stats              — Dashboard summary counts

    GET    /api/admin/listings           — List all listings (with filters)
    POST   /api/admin/listings           — Create a new listing
    GET    /api/admin/listings/:id       — Get single listing
    PUT    /api/admin/listings/:id       — Update a listing
    DELETE /api/admin/listings/:id       — Delete a listing

    GET    /api/admin/contacts           — List contacts/leads
    GET    /api/admin/contacts/:id       — Get single contact
    DELETE /api/admin/contacts/:id       — Delete a contact

    GET    /api/admin/locations          — List all locations
    POST   /api/admin/locations          — Create location
    PUT    /api/admin/locations/:id      — Update location
    DELETE /api/admin/locations/:id      — Delete location

    GET    /api/admin/services           — List all services
    POST   /api/admin/services           — Create service
    PUT    /api/admin/services/:id       — Update service
    DELETE /api/admin/services/:id       — Delete service
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import require_admin, verify_password, create_token

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ═══════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════


class LoginRequest(BaseModel):
    password: str


@router.post("/login")
async def login(body: LoginRequest):
    """
    Authenticate with the admin password and receive a JWT token.

    Request body: { "password": "your-admin-password" }
    Response: { "access_token": "...", "token_type": "bearer", "expires_in": 259200 }

    Use the token in subsequent requests:
        Authorization: Bearer <access_token>
    """
    if not verify_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid password")

    return create_token()


@router.get("/me")
async def get_me(admin=Depends(require_admin)):
    """Verify current token is valid. Returns admin info."""
    return {"user": "admin", "role": "admin"}


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/stats")
async def get_stats(admin=Depends(require_admin)):
    """Dashboard summary: total listings, available listings, total contacts."""
    from database import admin_get_stats
    return admin_get_stats()


# ═══════════════════════════════════════════════════════════════════════════
# LISTINGS CRUD
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/listings")
async def list_listings(
    status: Optional[str] = Query(None, description="Filter by listing status"),
    internal_status: Optional[str] = Query(None, description="Filter by internal status"),
    search: Optional[str] = Query(None, description="Search title, reference, or city"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    """List all listings with optional filters. Returns all fields including internal."""
    from database import admin_list_listings
    return admin_list_listings(
        status=status,
        internal_status=internal_status,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/listings/{listing_id}")
async def get_listing(listing_id: str, admin=Depends(require_admin)):
    """Get a single listing by ID (all fields, any status)."""
    from database import admin_get_listing

    listing = admin_get_listing(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.post("/listings", status_code=201)
async def create_listing(body: dict, admin=Depends(require_admin)):
    """
    Create a new listing.

    Send a JSON body with the listing fields. At minimum:
    {
        "reference": "LM-001",
        "title": "Riverfront Penthouse in Santos",
        "property_type": "penthouse",
        "listing_type": "sale",
        "price": 2850000,
        "region": "Lisbon",
        "city": "Lisbon",
        "area": "Santos",
        "bedrooms": 4,
        "bathrooms": 3,
        "interior_living_area": 280,
        "views": ["river", "city"],
        "short_description": "Stunning penthouse with panoramic river views.",
        "cover_image": "https://...",
        "company": "LUME by Mark",
        "listing_agent": "Mark"
    }

    The slug is auto-generated from the title + city if not provided.
    """
    from database import admin_create_listing

    try:
        listing = admin_create_listing(body)
        if not listing:
            raise HTTPException(status_code=500, detail="Failed to create listing")
        return listing
    except Exception as e:
        error_msg = str(e)
        # Surface Supabase/Postgres constraint errors clearly
        if "duplicate" in error_msg.lower():
            raise HTTPException(status_code=409, detail=f"Duplicate entry: {error_msg}")
        if "violates" in error_msg.lower():
            raise HTTPException(status_code=422, detail=f"Validation error: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


@router.put("/listings/{listing_id}")
async def update_listing(listing_id: str, body: dict, admin=Depends(require_admin)):
    """
    Update a listing. Send only the fields you want to change.

    Example: { "price": 2950000, "status": "available" }
    """
    from database import admin_update_listing

    if not body:
        raise HTTPException(status_code=422, detail="Empty update body")

    try:
        listing = admin_update_listing(listing_id, body)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        return listing
    except Exception as e:
        error_msg = str(e)
        if "violates" in error_msg.lower():
            raise HTTPException(status_code=422, detail=f"Validation error: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, admin=Depends(require_admin)):
    """Delete a listing permanently."""
    from database import admin_delete_listing

    success = admin_delete_listing(listing_id)
    if not success:
        raise HTTPException(status_code=404, detail="Listing not found or already deleted")
    return {"detail": "Listing deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# CONTACTS CRUD
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/contacts")
async def list_contacts(
    source: Optional[str] = Query(None, description="Filter by source"),
    search: Optional[str] = Query(None, description="Search email or name"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin=Depends(require_admin),
):
    """List contacts/leads with optional filters."""
    from database import admin_list_contacts
    return admin_list_contacts(
        source=source,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/contacts/{contact_id}")
async def get_contact(contact_id: str, admin=Depends(require_admin)):
    """Get a single contact by ID."""
    from database import admin_get_contact

    contact = admin_get_contact(contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, admin=Depends(require_admin)):
    """Delete a contact."""
    from database import admin_delete_contact

    success = admin_delete_contact(contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"detail": "Contact deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# LOCATIONS CRUD
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/locations")
async def list_locations(admin=Depends(require_admin)):
    """List all locations."""
    from database import admin_list_locations
    return {"locations": admin_list_locations()}


@router.post("/locations", status_code=201)
async def create_location(body: dict, admin=Depends(require_admin)):
    """
    Create a new location.

    { "name": "Cascais", "city": "Cascais", "region": "Lisbon District" }
    """
    from database import admin_create_location

    try:
        location = admin_create_location(body)
        if not location:
            raise HTTPException(status_code=500, detail="Failed to create location")
        return location
    except Exception as e:
        error_msg = str(e)
        if "duplicate" in error_msg.lower():
            raise HTTPException(status_code=409, detail=f"Duplicate: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


@router.put("/locations/{location_id}")
async def update_location(location_id: str, body: dict, admin=Depends(require_admin)):
    """Update a location."""
    from database import admin_update_location

    try:
        location = admin_update_location(location_id, body)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        return location
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/locations/{location_id}")
async def delete_location(location_id: str, admin=Depends(require_admin)):
    """Delete a location."""
    from database import admin_delete_location

    success = admin_delete_location(location_id)
    if not success:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"detail": "Location deleted"}


# ═══════════════════════════════════════════════════════════════════════════
# SERVICES CRUD
# ═══════════════════════════════════════════════════════════════════════════


@router.get("/services")
async def list_services(admin=Depends(require_admin)):
    """List all services (including inactive)."""
    from database import admin_list_services
    return {"services": admin_list_services()}


@router.post("/services", status_code=201)
async def create_service(body: dict, admin=Depends(require_admin)):
    """
    Create a new service.

    { "title": "Yacht Charters", "category": "home", "sort_order": 6 }
    """
    from database import admin_create_service

    try:
        service = admin_create_service(body)
        if not service:
            raise HTTPException(status_code=500, detail="Failed to create service")
        return service
    except Exception as e:
        error_msg = str(e)
        if "duplicate" in error_msg.lower():
            raise HTTPException(status_code=409, detail=f"Duplicate: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


@router.put("/services/{service_id}")
async def update_service(service_id: str, body: dict, admin=Depends(require_admin)):
    """Update a service."""
    from database import admin_update_service

    try:
        service = admin_update_service(service_id, body)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        return service
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, admin=Depends(require_admin)):
    """Delete a service."""
    from database import admin_delete_service

    success = admin_delete_service(service_id)
    if not success:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"detail": "Service deleted"}

# ═══════════════════════════════════════════════════════════════════════════
# REGIONS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/regions")
async def list_regions(admin=Depends(require_admin)):
    """Return all active regions for the listing form dropdown."""
    from database import get_all_regions
    return {"regions": get_all_regions()}