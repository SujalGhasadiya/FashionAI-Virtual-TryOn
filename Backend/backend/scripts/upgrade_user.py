import sys
from pymongo import MongoClient
from datetime import datetime, timezone
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

mongodb_url = os.getenv("MONGODB_URL")
db_name = os.getenv("MONGODB_DB_NAME", "chromafit")

client = MongoClient(mongodb_url)
db = client[db_name]

email = sys.argv[1] if len(sys.argv) > 1 else "user@example.com"
now = datetime.now(timezone.utc)

res = db.users.update_one(
    {"email": email},
    {
        "$set": {
            "subscription_plan": "premium",
            "subscription_started_at": now,
            "updated_at": now,
        }
    }
)

print(f"Matched: {res.matched_count}, Modified: {res.modified_count}")

user = db.users.find_one({"email": email})
print(f"User: {user.get('email')} is now on plan: {user.get('subscription_plan')}")
