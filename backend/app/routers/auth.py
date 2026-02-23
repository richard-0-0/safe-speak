"""
SafeSpeak — Auth Router
Handles user profile creation and lookup.
Auth itself is handled by Firebase Auth SDK on the client side.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.security import verify_firebase_token
from app.core.firebase import get_firestore_client
from app.models.schemas import UserProfile, ConversationCreate
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/profile", response_model=UserProfile)
@limiter.limit("10/minute")
async def create_or_update_profile(
    request: Request,
    profile: UserProfile,
    uid: str = Depends(verify_firebase_token),
):
    """
    Create or update the user's Firestore profile after Firebase Auth sign-in.
    Called once after login/register to sync the profile data.
    """
    if profile.uid != uid:
        raise HTTPException(status_code=403, detail="Cannot modify another user's profile.")

    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)

    from google.cloud.firestore import SERVER_TIMESTAMP

    user_data = {
        "uid": uid,
        "displayName": profile.displayName,
        "email": profile.email,
        "photoURL": profile.photoURL,
        "lastSeen": SERVER_TIMESTAMP,
    }

    existing = user_ref.get()
    if not existing.exists:
        user_data["createdAt"] = SERVER_TIMESTAMP

    user_ref.set(user_data, merge=True)

    logger.info("[Auth] Profile synced for user %s", uid)
    return profile


@router.post("/conversations")
@limiter.limit("10/minute")
async def create_conversation(
    request: Request,
    payload: ConversationCreate,
    uid: str = Depends(verify_firebase_token),
):
    """
    Create a new 1:1 conversation between the authenticated user
    and another user identified by email.
    """
    db = get_firestore_client()

    # Find the target user by email
    users_ref = db.collection("users")
    query = users_ref.where("email", "==", payload.participantEmail).limit(1)
    results = list(query.stream())

    if not results:
        raise HTTPException(
            status_code=404,
            detail="User not found. They need to create an account first.",
        )

    target_uid = results[0].id

    if target_uid == uid:
        raise HTTPException(
            status_code=400,
            detail="You cannot start a conversation with yourself.",
        )

    # Check if conversation already exists between these users
    convos_ref = db.collection("conversations")
    existing_query = convos_ref.where("participants", "array_contains", uid)
    for doc in existing_query.stream():
        data = doc.to_dict()
        if target_uid in data.get("participants", []):
            return {"conversationId": doc.id, "existing": True}

    # Create new conversation
    from google.cloud.firestore import SERVER_TIMESTAMP

    new_convo_ref = convos_ref.document()
    new_convo_ref.set({
        "participants": [uid, target_uid],
        "createdAt": SERVER_TIMESTAMP,
        "lastMessage": None,
    })

    logger.info("[Auth] New conversation %s between %s and %s", new_convo_ref.id, uid, target_uid)
    return {"conversationId": new_convo_ref.id, "existing": False}


@router.get("/users/search")
@limiter.limit("30/minute")
async def search_users(
    request: Request,
    email: str = "",
    uid: str = Depends(verify_firebase_token),
):
    """Search for users by email to start a conversation."""
    if not email or len(email) < 3:
        return {"users": []}

    db = get_firestore_client()
    users_ref = db.collection("users")
    query = users_ref.where("email", "==", email).limit(5)

    results = []
    for doc in query.stream():
        data = doc.to_dict()
        if data.get("uid") != uid:
            results.append({
                "uid": data.get("uid"),
                "displayName": data.get("displayName", ""),
                "email": data.get("email", ""),
                "photoURL": data.get("photoURL"),
            })

    return {"users": results}


@router.post("/users/batch")
@limiter.limit("30/minute")
async def batch_lookup_users(
    request: Request,
    uid: str = Depends(verify_firebase_token),
):
    """
    Batch lookup user profiles by UIDs.
    Accepts JSON body: { "uids": ["uid1", "uid2", ...] }
    Returns: { "users": { "uid1": { "displayName": "...", "email": "..." }, ... } }
    """
    body = await request.json()
    uids = body.get("uids", [])

    if not uids or not isinstance(uids, list):
        return {"users": {}}

    # Limit batch size to prevent abuse
    uids = uids[:50]

    db = get_firestore_client()
    result = {}

    for target_uid in uids:
        if not isinstance(target_uid, str) or not target_uid:
            continue
        try:
            user_doc = db.collection("users").document(target_uid).get()
            if user_doc.exists:
                data = user_doc.to_dict()
                result[target_uid] = {
                    "displayName": data.get("displayName", ""),
                    "email": data.get("email", ""),
                    "photoURL": data.get("photoURL"),
                }
            else:
                result[target_uid] = {
                    "displayName": "",
                    "email": "",
                    "photoURL": None,
                }
        except Exception as e:
            logger.warning("[Auth] Failed to look up user %s: %s", target_uid, e)
            result[target_uid] = {
                "displayName": "",
                "email": "",
                "photoURL": None,
            }

    return {"users": result}
