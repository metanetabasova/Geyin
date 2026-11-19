
from fastapi import FastAPI

from database.connection import create_tables
from routers.auth import router as auth_router
from wardrobe.routes import router as wardrobe_router
from fastapi.middleware.cors import CORSMiddleware

create_tables()

app = FastAPI(
    title="GEYIN API",
    description="Smart Wardrobe and Outfit Recommendation Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(wardrobe_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to GEYIN!",
        "project": "GEYIN",
        "status": "Backend is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }
