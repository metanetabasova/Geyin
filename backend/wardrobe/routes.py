
from fastapi import APIRouter, Depends, HTTPException
from sqlite3 import Connection
from typing import List

from database.connection import get_db
from routers.auth import get_current_user
from schemas.wardrobe import ClothingCreate, ClothingResponse


router = APIRouter(
    prefix="/wardrobe",
    tags=["Wardrobe"]
)


@router.post("/", response_model=ClothingResponse, status_code=201)
def add_clothing(
    clothing: ClothingCreate,
    db: Connection = Depends(get_db),
    current_user=Depends(get_current_user)
):
    cursor = db.execute(
        """
        INSERT INTO clothes
        (user_id, name, category, color, season, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            current_user["id"],
            clothing.name,
            clothing.category,
            clothing.color,
            clothing.season,
            clothing.image_url
        )
    )

    db.commit()

    return {
        "id": cursor.lastrowid,
        "name": clothing.name,
        "category": clothing.category,
        "color": clothing.color,
        "season": clothing.season,
        "image_url": clothing.image_url
    }


@router.get("/", response_model=List[ClothingResponse])
def get_clothes(
    db: Connection = Depends(get_db),
    current_user=Depends(get_current_user)
):
    clothes = db.execute(
        "SELECT * FROM clothes WHERE user_id = ? ORDER BY id DESC",
        (current_user["id"],)
    ).fetchall()

    return [dict(item) for item in clothes]


@router.get("/{clothing_id}", response_model=ClothingResponse)
def get_clothing(
    clothing_id: int,
    db: Connection = Depends(get_db),
    current_user=Depends(get_current_user)
):
    clothing = db.execute(
        "SELECT * FROM clothes WHERE id = ? AND user_id = ?",
        (clothing_id, current_user["id"])
    ).fetchone()

    if not clothing:
        raise HTTPException(
            status_code=404,
            detail="Clothing not found"
        )

    return dict(clothing)


@router.delete("/{clothing_id}")
def delete_clothing(
    clothing_id: int,
    db: Connection = Depends(get_db),
    current_user=Depends(get_current_user)
):
    cursor = db.execute(
        "DELETE FROM clothes WHERE id = ? AND user_id = ?",
        (clothing_id, current_user["id"])
    )

    db.commit()

    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Clothing not found"
        )

    return {
        "message": "Clothing deleted successfully"
    }
