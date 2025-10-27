"""
Vendor service layer for business logic and deduplication.
Uses composition for repository dependency injection, following single responsibility and dependency inversion principles.
Includes CSV import/export functionality with proper async/sync handling.

Design decisions:
- CSV export uses synchronous pandas for simplicity and performance
- CSV import uses async operations for database checks to maintain consistency
- Error handling provides detailed feedback per row for batch operations
- File validation ensures CSV format and required columns
"""

from typing import List, Optional, Union
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, UploadFile
from fastapi.responses import StreamingResponse
import pandas as pd
import io

from ..models.vendor import Vendor
from ..schemas.vendor import VendorCreate, VendorUpdate, VendorRead, ImportResult, ImportError
from ..schemas.vendor import VendorCreate, VendorUpdate, VendorRead, ImportResult, ImportError, VendorSearchParams, VendorPaginationResponse
from ..repositories.vendor_repository import VendorRepository


class VendorService:
    """
    Service layer for vendor business logic.
    Handles CRUD operations with tax ID deduplication and domain validation.

    Design decisions:
    - Single responsibility: only vendor business logic
    - Encapsulates repository: hides data access details from API layer
    - Dependency injection: repository injected via constructor
    - Business rules: tax ID uniqueness enforced here
    """

    def __init__(self, repository: VendorRepository):
        """
        Constructor injection for repository dependency.
        Enables testing with mock repositories.
        """
        self._repository = repository

    async def get_vendor_by_id(self, vendor_id: int) -> Optional[VendorRead]:
        """Get vendor by ID."""
        vendor = await self._repository.get_by_id(vendor_id)
        return VendorRead.model_validate(vendor) if vendor else None

    async def get_all_vendors(self) -> List[VendorRead]:
        """Get all vendors."""
        vendors = await self._repository.get_all()
        return [VendorRead.model_validate(vendor) for vendor in vendors]

    async def search_vendors_paged(
        self,
        search_params: VendorSearchParams,
        page: int = 1,
        page_size: int = 50
    ) -> VendorPaginationResponse:
        """
        Search and filter vendors with pagination.

        Design decisions:
        - Clean separation of search logic in repository
        - Pagination metadata included in response
        - Case-insensitive searching enforced at service level
        - Page size capped at 100 for performance

        Args:
            search_params: Vendor search criteria
            page: Page number (1-based)
            page_size: Number of items per page (1-100)

        Returns:
            Paginated search results with metadata
        """
        # Validate pagination parameters
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 1
        elif page_size > 100:
            page_size = 100

        # Perform search with repository
        vendors, total_count = await self._repository.search_vendors(
            name=search_params.name,
            tax_id=search_params.tax_id,
            address=search_params.address,
            contact_email=search_params.contact_email,
            page=page,
            page_size=page_size
        )

        # Calculate pagination metadata
        total_pages = (total_count + page_size - 1) // page_size  # Ceiling division

        # Convert to response model
        vendor_reads = [VendorRead.model_validate(vendor) for vendor in vendors]

        return VendorPaginationResponse(
            items=vendor_reads,
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    async def create_vendor(self, vendor_data: VendorCreate) -> VendorRead:
        """
        Create new vendor with tax ID deduplication.
        Raises HTTPException if tax ID already exists.
        """
        # Check for existing tax ID
        existing_vendor = await self._repository.get_by_tax_id(vendor_data.tax_id)
        if existing_vendor:
            raise HTTPException(
                status_code=400,
                detail=f"Vendor with tax ID '{vendor_data.tax_id}' already exists"
            )

        # Create new vendor entity
        vendor = Vendor(
            name=vendor_data.name,
            tax_id=vendor_data.tax_id,
            address=vendor_data.address,
            contact_email=vendor_data.contact_email
        )

        try:
            created_vendor = await self._repository.create(vendor)
            return VendorRead.model_validate(created_vendor)
        except IntegrityError:
            raise HTTPException(
                status_code=400,
                detail=f"Vendor with tax ID '{vendor_data.tax_id}' already exists"
            )

    async def update_vendor(self, vendor_id: int, vendor_data: VendorUpdate) -> Optional[VendorRead]:
        """
        Update existing vendor.
        If tax_id is provided, checks for conflicts with other vendors.
        """
        # Check if vendor exists
        existing_vendor = await self._repository.get_by_id(vendor_id)
        if not existing_vendor:
            return None

        # If tax_id is being updated, check for conflicts
        if vendor_data.tax_id and vendor_data.tax_id != existing_vendor.tax_id:
            conflict_vendor = await self._repository.get_by_tax_id(vendor_data.tax_id)
            if conflict_vendor and conflict_vendor.id != vendor_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Vendor with tax ID '{vendor_data.tax_id}' already exists"
                )

        # Build update data (only provided fields)
        update_data = vendor_data.model_dump(exclude_unset=True)

        updated_vendor = await self._repository.update(vendor_id, update_data)
        return VendorRead.model_validate(updated_vendor) if updated_vendor else None

    async def delete_vendor(self, vendor_id: int) -> bool:
        """Delete vendor by ID."""
        return await self._repository.delete(vendor_id)

    @staticmethod
    def export_vendors_csv(vendors: List[VendorRead]) -> str:
        """
        Export all vendors to CSV format string.
        Uses pandas for efficient CSV generation.

        Args:
            vendors: List of vendor read models to export

        Returns:
            CSV string content
        """
        if not vendors:
            # Return CSV with headers only
            df = pd.DataFrame(columns=['name', 'tax_id', 'address', 'contact_email'])
            return df.to_csv(index=False)

        # Convert vendors to dict format for pandas
        vendor_data = [
            {
                'name': vendor.name,
                'tax_id': vendor.tax_id,
                'address': vendor.address,
                'contact_email': vendor.contact_email
            }
            for vendor in vendors
        ]

        df = pd.DataFrame(vendor_data)
        return df.to_csv(index=False)

    async def import_vendors_csv(self, file: UploadFile) -> ImportResult:
        """
        Import vendors from CSV file.
        Validates each row, checks for duplicates, and provides detailed error reporting.
        """
        # Read CSV content
        content = await file.read()
        try:
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV file: {str(e)}")

        total_rows = len(df)
        success_count = 0
        errors: List[ImportError] = []

        # Expected columns
        expected_cols = {'name', 'tax_id', 'address', 'contact_email'}
        actual_cols = set(df.columns.str.lower())

        # Check if all required columns are present
        missing_cols = expected_cols - actual_cols
        if missing_cols:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_cols)}"
            )

        # Process each row
        for idx, row in df.iterrows():
            row_num = idx + 2  # +2 because pandas index starts at 0, and +1 for header

            try:
                # Extract and validate data
                raw_data = row.to_dict()

                vendor_data = VendorCreate(
                    name=str(row.get('name', '')).strip(),
                    tax_id=str(row.get('tax_id', '')).strip(),
                    address=str(row.get('address', '')) if pd.notna(row.get('address')) else None,
                    contact_email=str(row.get('contact_email', '')) if pd.notna(row.get('contact_email')) else None
                )

                # Basic validation
                if not vendor_data.name:
                    errors.append(ImportError(
                        row_number=row_num,
                        field='name',
                        error='Name is required',
                        raw_data=raw_data
                    ))
                    continue

                if not vendor_data.tax_id:
                    errors.append(ImportError(
                        row_number=row_num,
                        field='tax_id',
                        error='Tax ID is required',
                        raw_data=raw_data
                    ))
                    continue

                # Check for duplicate tax ID in existing data
                existing_vendor = await self._repository.get_by_tax_id(vendor_data.tax_id)
                if existing_vendor:
                    errors.append(ImportError(
                        row_number=row_num,
                        field='tax_id',
                        error=f"Vendor with tax ID '{vendor_data.tax_id}' already exists",
                        raw_data=raw_data
                    ))
                    continue

                # Create vendor
                await self.create_vendor(vendor_data)
                success_count += 1

            except Exception as e:
                errors.append(ImportError(
                    row_number=row_num,
                    field='general',
                    error=str(e),
                    raw_data=raw_data
                ))

        return ImportResult(
            total_rows=total_rows,
            success_count=success_count,
            error_count=len(errors),
            errors=errors
        )