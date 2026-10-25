from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import current_user
from ..models import Notification, User

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

@router.get("")
def list_notifications(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    ).all()

    unread_count = sum(1 for n in rows if not n.is_read)

    return {
        "unread_count": unread_count,
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "link": n.link,
                "is_read": n.is_read,
                "notification_type": n.notification_type,
                "created_at": n.created_at
            }
            for n in rows
        ]
    }

@router.post("/{nid}/read")
def mark_read(nid: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    notif = db.get(Notification, nid)
    if not notif or notif.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")

    notif.is_read = True
    db.commit()
    return {"message": "Marked as read", "id": nid}

@router.post("/read-all")
def mark_all_read(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False))
    ).all()
    for n in rows:
        n.is_read = True
    db.commit()
    return {"message": f"Marked {len(rows)} notifications as read"}
