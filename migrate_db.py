"""
Migration script: adds new columns & tables for the Account & Orders upgrade.
Safe to run multiple times — uses IF NOT EXISTS / try-except for columns.
"""
import asyncio
import os
import sys

sys.path.append(os.getcwd())

from backend.database import engine, Base
from backend.models import db_models

COLUMN_MIGRATIONS = [
    # (table, column, type_sql, default)
    ("users", "name", "VARCHAR", None),
    ("orders", "status", "VARCHAR", "'processing'"),
    ("orders", "delivery_address", "VARCHAR", None),
]


async def main():
    async with engine.begin() as conn:
        # 1. Add missing columns to existing tables
        for table, col, col_type, default in COLUMN_MIGRATIONS:
            default_clause = f" DEFAULT {default}" if default else ""
            sql = f"ALTER TABLE {table} ADD COLUMN {col} {col_type}{default_clause}"
            try:
                await conn.execute(__import__('sqlalchemy').text(sql))
                print(f"  Added column {table}.{col}")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"  Column {table}.{col} already exists — skipping")
                else:
                    print(f"  Column {table}.{col} — {e}")

        # 2. Create any new tables (addresses, wishlists)
        await conn.run_sync(Base.metadata.create_all)
        print("  New tables created (if any)")

    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(main())
