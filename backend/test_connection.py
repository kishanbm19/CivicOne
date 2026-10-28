"""Database connection test script for CivicOne."""
import sys
from app.core.config import settings
from sqlalchemy import create_engine, text

def test_connection():
    print(f"Testing connection to: {settings.DATABASE_URL}")
    try:
        connect_args = {}
        if settings.DATABASE_URL.startswith("sqlite"):
            connect_args = {"check_same_thread": False}
        
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).scalar()
            print("\n[SUCCESS] Successfully connected to PostgreSQL!")
            print(f"Database Server Version: {result}\n")
            return True
    except Exception as e:
        print("\n[FAILED] Unable to connect to database.")
        print(f"Error details: {e}\n")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
