
from pydantic import BaseModel, Field
from typing import Optional


class ClothingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    category: str
    color: Optional[str] = None
    season: Optional[str] = None
    image_url: Optional[str] = None


class ClothingResponse(BaseModel):
    id: int
    name: str
    category: str
    color: Optional[str]
    season: Optional[str]
    image_url: Optional[str]
