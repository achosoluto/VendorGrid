"""
FastAPI routes for vendor CRUD operations.
Thin controllers that delegate to service layer for business logic.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.vendor import VendorCreate, VendorUpdate, VendorRead, ImportResult, VendorSearchParams, VendorPaginationResponse
from ..services.vendor_service import VendorService
from ..repositories.vendor_repository import VendorRepository
from ..database import get_db_session

router = APIRouter()

# Local dependency functions to avoid circular imports - simplified synchronous approach
def get_vendor_repository_simple(session: AsyncSession = Depends(get_db_session)) -> VendorRepository:
    return VendorRepository(session)

def get_vendor_service_simple(repository: VendorRepository = Depends(get_vendor_repository_simple)) -> VendorService:
    return VendorService(repository)

@router.get("/vendors", response_model=List[VendorRead])
async def get_vendors(service: VendorService = Depends(get_vendor_service_simple)):
    """Get all vendors."""
    return await service.get_all_vendors()

@router.get("/vendors/search", response_model=VendorPaginationResponse)
async def search_vendors(
    name: Optional[str] = Query(None, description="Search by vendor name (case-insensitive partial match)"),
    tax_id: Optional[str] = Query(None, description="Search by tax ID (case-insensitive partial match)"),
    address: Optional[str] = Query(None, description="Search by address (case-insensitive partial match)"),
    contact_email: Optional[str] = Query(None, description="Search by contact email (case-insensitive partial match)"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (1-100)"),
    service: VendorService = Depends(get_vendor_service)
):
    """
    Search and filter vendors with pagination.

    Performs case-insensitive partial matching on any of the provided fields.
    Returns paginated results with metadata including total count and page information.

    Query parameters:
    - name: Vendor name (partial match)
    - tax_id: Tax ID (partial match)
    - address: Address (partial match)
    - contact_email: Contact email (partial match)
    - page: Page number (default 1)
    - page_size: Items per page (default 50, max 100)
    """
    search_params = VendorSearchParams(
        name=name,
        tax_id=tax_id,
        address=address,
        contact_email=contact_email
    )

    return await service.search_vendors_paged(search_params, page=page, page_size=page_size)

@router.get("/vendors/{vendor_id}", response_model=VendorRead)
async def get_vendor(vendor_id: int, service: VendorService = Depends(get_vendor_service)):
    """Get vendor by ID."""
    vendor = await service.get_vendor_by_id(vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.post("/vendors", response_model=VendorRead, status_code=201)
async def create_vendor(vendor: VendorCreate, service: VendorService = Depends(get_vendor_service)):
    """Create new vendor."""
    try:
        return await service.create_vendor(vendor)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/vendors/{vendor_id}", response_model=VendorRead)
async def update_vendor(vendor_id: int, vendor_update: VendorUpdate, service: VendorService = Depends(get_vendor_service)):
    """Update existing vendor."""
    try:
        updated_vendor = await service.update_vendor(vendor_id, vendor_update)
        if not updated_vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        return updated_vendor
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/vendors/{vendor_id}", status_code=204)
async def delete_vendor(vendor_id: int, service: VendorService = Depends(get_vendor_service)):
    """Delete vendor by ID."""
    deleted = await service.delete_vendor(vendor_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return None


@router.get("/vendors/export")
async def export_vendors_csv(service: VendorService = Depends(get_vendor_service)):
    """
    Export all vendors to CSV file.

    Returns:
        StreamingResponse: CSV file download
    """
    try:
        vendors = await service.get_all_vendors()
        csv_content = VendorService.export_vendors_csv(vendors)

        # Create streaming response with CSV content
        def iter_csv():
            yield csv_content

        return StreamingResponse(
            iter_csv(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=vendors.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/vendors/import", response_model=ImportResult)
async def import_vendors_csv(
    file: UploadFile = File(...),
    service: VendorService = Depends(get_vendor_service)
):
    """
    Import vendors from CSV file.

    Validates each row, checks for duplicates, and provides detailed error reporting.
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV file")

        # Process CSV import
        result = await service.import_vendors_csv(file)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")