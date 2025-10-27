"""
Vendor repository implementation using composition over inheritance.
Implements the BaseRepository protocol for dependency inversion and testability.
"""

from typing import List, Optional, Tuple
from sqlalchemy import select, update, delete, and_, or_, func
from sqlalchemy.exc import IntegrityError

from .base import BaseRepository
from ..models.vendor import Vendor


class VendorRepository(BaseRepository[Vendor, int]):
    """
    Repository for Vendor entities.
    Encapsulates all data access logic for vendor CRUD operations.

    Design decisions:
    - Uses composition for session management (injected via constructor)
    - Single responsibility: only handles vendor data operations
    - Dependency inversion: implements protocol for flexible injection
    """

    async def get_by_id(self, id: int) -> Optional[Vendor]:
        """Retrieve vendor by ID."""
        result = await self._session.execute(
            select(Vendor).where(Vendor.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_tax_id(self, tax_id: str) -> Optional[Vendor]:
        """Retrieve vendor by tax ID for deduplication checks."""
        result = await self._session.execute(
            select(Vendor).where(Vendor.tax_id == tax_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self) -> List[Vendor]:
        """Retrieve all vendors."""
        result = await self._session.execute(select(Vendor))
        return result.scalars().all()

    async def create(self, vendor: Vendor) -> Vendor:
        """
        Create new vendor.
        Raises IntegrityError if tax_id already exists (unique constraint).
        """
        self._session.add(vendor)
        await self._session.flush()  # Get the generated ID
        await self._session.refresh(vendor)  # Load any defaults
        return vendor

    async def update(self, id: int, vendor_data: dict) -> Optional[Vendor]:
        """
        Update vendor by ID with partial data.
        Returns updated vendor or None if not found.
        """
        result = await self._session.execute(
            update(Vendor)
            .where(Vendor.id == id)
            .values(**vendor_data)
            .returning(Vendor)
        )
        updated_vendor = result.scalar_one_or_none()
        if updated_vendor:
            await self._session.refresh(updated_vendor)
        return updated_vendor

    async def delete(self, id: int) -> bool:
        """Delete vendor by ID. Returns True if deleted, False if not found."""
        result = await self._session.execute(
            delete(Vendor).where(Vendor.id == id)
        )
        return result.rowcount > 0
    async def search_vendors(
        self,
        name: Optional[str] = None,
        tax_id: Optional[str] = None,
        address: Optional[str] = None,
        contact_email: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[List[Vendor], int]:
        """
        Search and filter vendors with pagination.
        Performs case-insensitive partial matching on provided fields.

        Args:
            name: Partial match on vendor name
            tax_id: Partial match on tax ID
            address: Partial match on address
            contact_email: Partial match on contact email
            page: Page number (1-based)
            page_size: Number of items per page (max 100)

        Returns:
            Tuple of (vendors_list, total_count)
        """
        # Build filter conditions
        conditions = []

        if name:
            # Case-insensitive partial match using LIKE with lower()
            conditions.append(func.lower(Vendor.name).like(f"%{name.lower()}%"))

        if tax_id:
            conditions.append(func.lower(Vendor.tax_id).like(f"%{tax_id.lower()}%"))

        if address:
            conditions.append(func.lower(Vendor.address).like(f"%{address.lower()}%"))

        if contact_email:
            conditions.append(func.lower(Vendor.contact_email).like(f"%{contact_email.lower()}%"))

        # Build base query
        query = select(Vendor)

        if conditions:
            # Combine all conditions with OR for matching any of the provided fields
            query = query.where(or_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(Vendor)
        if conditions:
            count_query = count_query.where(or_(*conditions))

        count_result = await self._session.execute(count_query)
        total_count = count_result.scalar_one()

        # Apply ordering (by ID for consistent pagination)
        query = query.order_by(Vendor.id)

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        # Execute paginated query
        result = await self._session.execute(query)
        vendors = result.scalars().all()

        return vendors, total_count