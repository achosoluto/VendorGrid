"""
SQLAlchemy database configuration with session management.
Uses composition for flexible database engine configuration and single responsibility principle.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./vendors.db")

# Async engine for production use
async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for debugging
    future=True,
)

# Sync engine for migrations/alembic (if needed later)
sync_engine = create_engine(
    DATABASE_URL.replace("+aiosqlite", ""),
    echo=False,
)

# Async session factory
async_session_maker = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Sync session factory (for initialization)
sync_session_maker = sessionmaker(
    sync_engine,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncSession:
    """
    Dependency injector for database sessions.
    Provides async session directly without context manager.
    """
    return async_session_maker()


def get_sync_session():
    """
    Synchronous session for one-off operations like database initialization.
    """
    return sync_session_maker()