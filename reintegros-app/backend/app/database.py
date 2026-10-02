from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

_en_render = os.getenv("RENDER", "").lower() == "true"
_database_url = os.getenv("DATABASE_URL")

if _en_render and not _database_url:
    raise RuntimeError(
        "DATABASE_URL es obligatoria en Render para evitar usar SQLite temporal."
    )

DATABASE_URL = _database_url or "sqlite:///./reintegros.db"
if _en_render and DATABASE_URL.startswith("sqlite:"):
    raise RuntimeError("Render debe conectarse a PostgreSQL, no a SQLite local.")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
