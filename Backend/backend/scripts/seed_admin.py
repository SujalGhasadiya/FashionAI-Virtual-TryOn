"""
Script to create or reset the administrator account in the MongoDB database.

Usage:
    python scripts/seed_admin.py
    python scripts/seed_admin.py --email admin@fashionai.com --password Admin@123 --name "FashionAI Admin"
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
import bcrypt

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

# Load .env
env_path = backend_dir / ".env"
load_dotenv(env_path)

MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "chromafit")

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def seed_admin(email: str, password: str, name: str, role: str = "super_admin"):
    if not MONGODB_URL:
        print("[ERROR] MONGODB_URL is not set in .env")
        sys.exit(1)

    print(f"Connecting to MongoDB database: {MONGODB_DB_NAME}...")
    client = MongoClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    
    email_clean = email.strip().lower()
    now = datetime.now(timezone.utc)
    hashed_password = get_password_hash(password)

    existing = db.admins.find_one({"email": email_clean})
    if existing:
        db.admins.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "name": name,
                    "hashed_password": hashed_password,
                    "role": role,
                    "is_active": True,
                    "updated_at": now,
                }
            }
        )
        print("\n========================================================")
        print("  ADMIN ACCOUNT UPDATED SUCCESSFULLY")
        print("========================================================")
    else:
        admin_doc = {
            "name": name,
            "email": email_clean,
            "hashed_password": hashed_password,
            "role": role,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        res = db.admins.insert_one(admin_doc)
        print("\n========================================================")
        print("  ADMIN ACCOUNT CREATED SUCCESSFULLY")
        print("========================================================")

    total_admins = db.admins.count_documents({})
    print(f"Total admin accounts in database: {total_admins}")
    print(f"Admin Email:    {email_clean}")
    print(f"Admin Password: {password}")
    print(f"Admin Name:     {name}")
    print(f"Admin Role:     {role}")
    print("--------------------------------------------------------")
    print("Login URL:      http://localhost:5173/login")
    print("Admin Portal:   http://localhost:5173/admin/dashboard")
    print("========================================================\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or update an administrator account.")
    parser.add_argument("--email", default="admin@fashionai.com", help="Admin email address")
    parser.add_argument("--password", default="Admin@123", help="Admin password")
    parser.add_argument("--name", default="FashionAI Admin", help="Admin display name")
    parser.add_argument("--role", default="super_admin", help="Admin role")

    args = parser.parse_args()
    seed_admin(args.email, args.password, args.name, args.role)
