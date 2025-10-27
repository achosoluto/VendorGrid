"""
Pydantic schemas for P-2501 integration API.
Defines structures for clean JSON APIs with webhooks for external integrations.
Following single responsibility principle with focused schemas for integration operations.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class IntegrationVendorRead(BaseModel):
    """
    Schema for vendor data structured for P-2501 AI consumption.
    Simplified, clean structure optimized for automated processing.
    """
    id: int
    name: str
    tax_id: str
    status: str = Field(description="Vendor status (active/inactive/pending)")
    address: Optional[str] = None
    contact_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VendorChange(BaseModel):
    """
    Schema representing a single vendor data change.
    Used for delta updates and change tracking.
    """
    vendor_id: int
    change_type: str = Field(description="Type of change: created, updated, deleted")
    changed_fields: Optional[List[str]] = Field(
        None,
        description="Fields that were changed (for updates)"
    )
    timestamp: datetime
    vendor_data: IntegrationVendorRead


class VendorChangesResponse(BaseModel):
    """
    Schema for delta updates response containing changes since a timestamp.
    Includes pagination for large change sets.
    """
    changes: List[VendorChange]
    total_changes: int
    since_timestamp: datetime
    page: int = Field(ge=1, description="Current page number")
    page_size: int = Field(ge=1, le=100, description="Items per page")
    total_pages: int


class WebhookEventType(str, Enum):
    """
    Enumeration of webhook event types for external integrations.
    """
    VENDOR_CREATED = "vendor.created"
    VENDOR_UPDATED = "vendor.updated"
    VENDOR_DELETED = "vendor.deleted"
    VENDOR_IMPORTED = "vendor.imported"


class WebhookPayload(BaseModel):
    """
    Schema for webhook payload sent to external systems.
    Standardized format for all integration events.
    """
    event_type: WebhookEventType
    event_id: str = Field(description="Unique identifier for this event")
    timestamp: datetime
    data: Dict[str, Any] = Field(description="Event-specific data payload")
    source: str = Field(default="vendorgrid", description="Source system identifier")


class WebhookTestRequest(BaseModel):
    """
    Schema for webhook testing endpoint.
    Allows external systems to verify webhook configuration.
    """
    test_message: Optional[str] = "Webhook test successful"


class WebhookTestResponse(BaseModel):
    """
    Response schema for webhook testing.
    Confirms webhook functionality and provides status.
    """
    status: str = "success"
    message: str = "Webhook test completed"
    timestamp: datetime


class IntegrationHealthCheck(BaseModel):
    """
    Health check response for integration endpoints.
    Provides status and basic metrics for monitoring.
    """
    status: str = "healthy"
    service: str = "VendorGrid P-2501 Integration"
    timestamp: datetime
    total_vendors: Optional[int] = None
    last_updated: Optional[datetime] = None


class ApiKeyValidateRequest(BaseModel):
    """
    Schema for API key validation requests.
    Used by integrations to verify authentication.
    """
    api_key: str


class ApiKeyValidateResponse(BaseModel):
    """
    Response for API key validation.
    Indicates whether the provided key is valid and active.
    """
    valid: bool
    message: str
    expires_at: Optional[datetime] = None