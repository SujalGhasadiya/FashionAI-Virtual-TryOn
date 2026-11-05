import sys
from pathlib import Path


backend_root = Path(__file__).resolve().parents[1] / "backend"
if str(backend_root) not in sys.path:
    sys.path.append(str(backend_root))

from app.database.connection import ping_database


def test_mongodb() -> None:
    try:
        result = ping_database()
        print(f"MongoDB connection successful: {result}")
    except Exception as exc:
        print(f"MongoDB connection failed: {exc}")


if __name__ == "__main__":
    test_mongodb()
