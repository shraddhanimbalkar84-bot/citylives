import sys
from app.database import engine, Base, SessionLocal
from app.services.seed_data import seed_database

def main():
    print("Initializing CivicEye database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Seeding database with realistic civic reports and demo accounts...")
        seed_database(db)
        print("Database seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
