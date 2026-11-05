"""
MongoDB Index Setup for Single-Session Authentication

Run this script once to create the required indexes for optimal performance.

Usage:
    python setup_mongodb_indexes.py
"""

from pymongo import MongoClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("MONGODB_DB_NAME", "fashionai")

def setup_indexes():
    """Create all necessary MongoDB indexes for single-session authentication"""
    
    client = MongoClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    sessions_collection = db.sessions
    
    print(f"Connecting to MongoDB: {MONGODB_URL}")
    print(f"Database: {DATABASE_NAME}")
    print()
    
    # List of indexes to create
    indexes = [
        {
            "name": "user_id_is_active",
            "keys": [("user_id", 1), ("is_active", 1)],
            "options": {}
        },
        {
            "name": "session_id_unique",
            "keys": [("session_id", 1)],
            "options": {"unique": True}
        },
        {
            "name": "email",
            "keys": [("email", 1)],
            "options": {}
        },
        {
            "name": "expires_at_ttl",
            "keys": [("expires_at", 1)],
            "options": {
                "expireAfterSeconds": 0,
                "name": "sessions_ttl"
            }
        },
        {
            "name": "created_at",
            "keys": [("created_at", 1)],
            "options": {}
        },
        {
            "name": "is_active",
            "keys": [("is_active", 1)],
            "options": {}
        }
    ]
    
    # Create indexes
    for index in indexes:
        try:
            index_name = sessions_collection.create_index(
                index["keys"],
                **index["options"]
            )
            print(f"✓ Created index: {index['name']}")
            print(f"  Index name: {index_name}")
        except Exception as e:
            print(f"✗ Failed to create index {index['name']}: {str(e)}")
    
    print()
    print("Index setup complete!")
    print()
    
    # Display existing indexes
    print("Existing indexes in 'sessions' collection:")
    indexes_info = list(sessions_collection.list_indexes())
    for idx in indexes_info:
        print(f"  - {idx['name']}: {idx['key']}")
    
    client.close()


if __name__ == "__main__":
    try:
        setup_indexes()
    except Exception as e:
        print(f"Error: {str(e)}")
        exit(1)
