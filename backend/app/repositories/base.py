"""
Base repository interface (protocol) for dependency inversion.
Using protocols for interface definition enables dependency injection without tight coupling.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, TypeVar, Generic
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar('T')
ID = TypeVar('ID')


class BaseRepository(Generic[T, ID], ABC):
    """
    Abstract base class defining the contract for repository pattern implementation.
    Following interface segregation principle - each repository implements only needed operations.
    """

    def __init__(self, session: AsyncSession):
        """
        Constructor injection for database session.
        Enables dependency inversion and makes repositories testable.
        """
        self._session = session

    @abstractmethod
    async def get_by_id(self, id: ID) -> Optional[T]:
        """Get entity by ID."""
        pass

    @abstractmethod
    async def get_all(self) -> List[T]:
        """Get all entities."""
        pass

    @abstractmethod
    async def create(self, entity: T) -> T:
        """Create new entity."""
        pass

    @abstractmethod
    async def update(self, id: ID, entity: T) -> Optional[T]:
        """Update existing entity."""
        pass

    @abstractmethod
    async def delete(self, id: ID) -> bool:
        """Delete entity by ID."""
        pass