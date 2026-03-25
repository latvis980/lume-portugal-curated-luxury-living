# backend/routes/public_forms.py
"""
Public form submission routes for LUME by Mark.

These are unauthenticated endpoints that allow visitors to submit
their information via the questionnaire and Private Access form.

The Supabase RLS policy allows anon INSERT on the contacts table.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any

router = APIRouter(prefix="/api", tags=["forms"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class QuestionnaireSubmission(BaseModel):
    """Submitted when user completes the 5-step questionnaire + email."""
    email: str  # using str instead of EmailStr to avoid extra dep
    answers: Dict[str, str]  # { "1": "Relocation", "2": "Ocean", ... }


class PrivateAccessSubmission(BaseModel):
    """Submitted from the Private Access form at the bottom of the page."""
    name: str
    email: str
    phone: Optional[str] = None
    message: Optional[str] = None


class NewsletterSubmission(BaseModel):
    """Simple email subscription."""
    email: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/submit/questionnaire", status_code=201)
async def submit_questionnaire(body: QuestionnaireSubmission):
    """
    Save questionnaire answers + email.

    Called when the user completes the "Discover Your Match" flow
    and enters their email.
    """
    from database import create_contact

    try:
        contact = create_contact({
            "email": body.email,
            "source": "questionnaire",
            "questionnaire_answers": body.answers,
        })
        return {"status": "ok", "message": "Thank you! We'll curate your selection."}
    except Exception as e:
        error_msg = str(e)
        # If email already exists, update the questionnaire answers
        if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
            try:
                from database import _get_admin_client
                client = _get_admin_client()
                client.table("contacts").update({
                    "questionnaire_answers": body.answers,
                    "source": "questionnaire",
                }).eq("email", body.email).execute()
                return {"status": "ok", "message": "Preferences updated!"}
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Failed to save. Please try again.")


@router.post("/submit/private-access", status_code=201)
async def submit_private_access(body: PrivateAccessSubmission):
    """
    Save Private Access form submission.

    Called from the "Request Private Access" form at the bottom
    of the landing page.
    """
    from database import create_contact

    try:
        contact = create_contact({
            "email": body.email,
            "name": body.name,
            "phone": body.phone,
            "message": body.message,
            "source": "private_access",
        })
        return {"status": "ok", "message": "A member of our team will be in touch within 24 hours."}
    except Exception as e:
        error_msg = str(e)
        if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
            try:
                from database import _get_client
                client = _get_client()
                client.table("contacts").update({
                    "name": body.name,
                    "phone": body.phone,
                    "message": body.message,
                    "source": "private_access",
                }).eq("email", body.email).execute()
                return {"status": "ok", "message": "Thank you! We've updated your request."}
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Failed to save. Please try again.")


@router.post("/submit/newsletter", status_code=201)
async def submit_newsletter(body: NewsletterSubmission):
    """Simple email capture for newsletter / general interest."""
    from database import create_contact

    try:
        contact = create_contact({
            "email": body.email,
            "source": "newsletter",
        })
        return {"status": "ok", "message": "You're on the list!"}
    except Exception as e:
        error_msg = str(e)
        if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
            return {"status": "ok", "message": "You're already subscribed!"}
        raise HTTPException(status_code=500, detail="Failed to save. Please try again.")
