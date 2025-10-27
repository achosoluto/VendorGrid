"""
Pydantic schemas for vendor input/output validation.
Following single responsibility principle with separate schemas for create, update, and read operations.
Includes CSV import/export related schemas.
"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class VendorBase(BaseModel):
    """
    Base schema for vendor data with common fields.
    """
    name: str
    tax_id: str
    address: Optional[str] = None
    contact_email: Optional[EmailStr] = None


class VendorCreate(VendorBase):
    """
    Schema for creating a new vendor.
    All required fields must be provided.
    """
    pass


class VendorUpdate(BaseModel):
    """
    Schema for updating an existing vendor.
    All fields are optional to allow partial updates.
    """
    name: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[EmailStr] = None


class VendorRead(VendorBase):
    """
    Schema for reading vendor data including system-generated fields.
    """
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ImportError(BaseModel):
    """
    Schema for import error details.
    """
    row_number: int
    field: str
    error: str
    raw_data: Optional[dict] = None


class ImportResult(BaseModel):
    """
    Schema for CSV import operation results.
    """
    total_rows: int
    success_count: int
    error_count: int
    errors: List[ImportError] = []


class VendorSearchParams(BaseModel):
    """
    Schema for vendor search and filtering parameters.
    Supports case-insensitive partial matching on name, tax_id, address, and contact_email.
    """
    name: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None


class VendorPaginationResponse(BaseModel):
    """
    Schema for paginated vendor search results.
    Includes metadata about pagination and total count.
    """
    items: List[VendorRead]
    total: int
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    total_pages: int