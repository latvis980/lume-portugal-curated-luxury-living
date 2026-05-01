# backend/routes/public_forms.py
"""
Public form submission routes for LUME by Mark.

These are unauthenticated endpoints that allow visitors to submit
their information via the questionnaire and Contact form.

The Supabase RLS policy allows anon INSERT on the contacts table.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict

router = APIRouter(prefix="/api", tags=["forms"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class QuestionnaireSubmission(BaseModel):
    """Submitted when user completes the branching questionnaire + email."""
    email: str  # using str instead of EmailStr to avoid extra dep
    answers: Dict[str, str]
    # Top-level branch derived from Q1 ("relocation" | "second_home" |
    # "investment" | "exploring"). Sent by the frontend so admin can filter
    # contacts by branch without parsing the JSON blob. Optional for
    # backwards compatibility with any older clients.
    branch: Optional[str] = None


class ContactSubmission(BaseModel):
    """Submitted from the Contact form at the bottom of the page."""
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

    Called when the user completes the questionnaire and enters their email.
    Stores the full answers blob plus the derived branch on the contact row.
    """
    from database import create_contact

    # Build the payload — `branch` is folded into the answers blob so it
    # lives alongside the rest, AND optionally lifted to a top-level column
    # if you've added one (`questionnaire_branch`). If that column doesn't
    # exist, Supabase will reject the unknown column; in that case just
    # remove the `questionnaire_branch` line below.
    answers_with_branch = dict(body.answers)
    if body.branch:
        # Make sure the branch is in the JSON too, so admin viewers see it
        # without needing the extra column. The frontend already sends
        # q1_intent in answers, but this is defensive in case that changes.
        answers_with_branch.setdefault("_branch", body.branch)

    payload = {
        "email": body.email,
        "source": "questionnaire",
        "questionnaire_answers": answers_with_branch,
    }

    try:
        create_contact(payload)
        return {"status": "ok", "message": "Thank you! We'll curate your selection."}
    except Exception as e:
        error_msg = str(e)
        # If email already exists, update the questionnaire answers
        if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
            try:
                from database import _get_admin_client
                client = _get_admin_client()
                client.table("contacts").update({
                    "questionnaire_answers": answers_with_branch,
                    "source": "questionnaire",
                }).eq("email", body.email).execute()
                return {"status": "ok", "message": "Preferences updated!"}
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Failed to save. Please try again.")


@router.post("/submit/contact", status_code=201)
async def submit_contact(body: ContactSubmission):
    """
    Save Contact form submission.
    Called from the Contact form at the bottom of the page.
    """
    from database import create_contact

    try:
        create_contact({
            "email": body.email,
            "name": body.name,
            "phone": body.phone,
            "message": body.message,
            "source": "contact",
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
                    "source": "contact",
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
        create_contact({
            "email": body.email,
            "source": "newsletter",
        })
        return {"status": "ok", "message": "You're on the list!"}
    except Exception as e:
        error_msg = str(e)
        if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
            return {"status": "ok", "message": "You're already subscribed!"}
        raise HTTPException(status_code=500, detail="Failed to save. Please try again.")
