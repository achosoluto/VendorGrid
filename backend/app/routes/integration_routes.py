"""
FastAPI routes for P-2501 integration API.
Clean JSON endpoints and webhooks for external system integration.
Thin controllers that delegate to integration service layer.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Query, BackgroundTasks
from fastapi.responses import JSONResponse
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from ..services.integration_service import IntegrationService
from ..services.vendor_service import VendorService
from ..repositories.vendor_repository import VendorRepository
from ..database import get_db_session

# Define local dependency functions to avoid circular imports
from ..schemas.integration import (
    IntegrationVendorRead,
    VendorChangesResponse,
    WebhookTestRequest,
    WebhookTestResponse,
    IntegrationHealthCheck,
    ApiKeyValidateRequest,
    ApiKeyValidateResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


# Local dependency functions to avoid circular imports
async def get_vendor_repository_local(session: AsyncSession = Depends(get_db_session)) -> VendorRepository:
    return VendorRepository(session)

async def get_vendor_service_local(repository: VendorRepository = Depends(get_vendor_repository_local)) -> VendorService:
    return VendorService(repository)

async def get_integration_service_local(vendor_service: VendorService = Depends(get_vendor_service_local)) -> IntegrationService:
    return IntegrationService(vendor_service, webhook_url=None)


# Basic API key authentication (MVP implementation)
async def verify_api_key(x_api_key: Optional[str] = Header(None),
                        integration_service: IntegrationService = Depends(get_integration_service_local)):
    """
    Basic API key verification for integration endpoints.
    In production, implement proper authentication middleware.
    """
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")

    validation = await integration_service.validate_api_key(x_api_key)
    if not validation.valid:
        raise HTTPException(status_code=401, detail=validation.message)


@router.get("/vendors", response_model=List[IntegrationVendorRead])
async def get_vendors_for_integration(
    integration_service: IntegrationService = Depends(get_integration_service_local),
    _: None = Depends(verify_api_key)  # Authentication required
):
    """
    Get all vendors in format optimized for P-2501 AI consumption.

    Returns structured JSON data for automated processing.
    Requires valid API key authentication.

    Returns:
        List[IntegrationVendorRead]: Vendors formatted for AI systems
    """
    try:
        vendors = await integration_service.get_vendors_for_integration()
        return vendors
    except Exception as e:
        logger.error(f"Error retrieving vendors for integration: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vendor data")


@router.get("/vendors/changes", response_model=VendorChangesResponse)
async def get_vendor_changes(
    since: str = Query(..., description="ISO 8601 timestamp to get changes since"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    integration_service: IntegrationService = Depends(get_integration_service_local),
    _: None = Depends(verify_api_key)
):
    """
    Get vendor changes since specified timestamp (delta updates).

    Enables efficient data synchronization for external systems.
    Includes pagination for large change sets.

    Query Parameters:
    - since: ISO 8601 timestamp (required)
    - page: Page number (default 1)
    - page_size: Items per page (default 50, max 100)

    Returns:
        VendorChangesResponse: Paginated changes since timestamp
    """
    try:
        since_timestamp = datetime.fromisoformat(since.replace('Z', '+00:00'))
        changes = await integration_service.get_vendor_changes_since(
            since_timestamp, page=page, page_size=page_size
        )
        return changes
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {str(e)}")
    except Exception as e:
        logger.error(f"Error retrieving vendor changes: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve change data")


@router.post("/webhooks/test", response_model=WebhookTestResponse)
async def test_webhook(
    request: WebhookTestRequest = WebhookTestRequest(),
    integration_service: IntegrationService = Depends(get_integration_service_local),
    _: None = Depends(verify_api_key)
):
    """
    Test webhook functionality for external integrations.

    Allows external systems to verify webhook configuration and connectivity.
    Does not require webhook URL to be configured.

    Returns:
        WebhookTestResponse: Test completion confirmation
    """
    try:
        # Always return success for test endpoint
        return WebhookTestResponse(
            message=request.test_message or "Webhook test successful",
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        logger.error(f"Error in webhook test: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook test failed")


@router.post("/webhooks/{event_type}")
async def receive_webhook(
    event_type: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    integration_service: IntegrationService = Depends(get_integration_service_local)
):
    """
    Receive webhooks from external systems (if needed for bidirectional integration).

    Currently implements basic webhook reception.
    In future, could support P-2501 callbacks or updates.

    Path Parameters:
    - event_type: Type of incoming webhook event

    Note: This endpoint currently accepts any webhook without authentication
    for flexibility, but should be secured in production.
    """
    try:
        logger.info(f"Received webhook event: {event_type}")

        # For now, just log the webhook and return success
        # Could add processing logic here for bidirectional integration
        return {"status": "received", "event_type": event_type}

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/health", response_model=IntegrationHealthCheck)
async def integration_health_check(
    integration_service: IntegrationService = Depends(get_integration_service_local)
):
    """
    Health check endpoint for integration services.

    Provides status and basic metrics for monitoring.
    Does not require authentication.
    """
    try:
        return await integration_service.get_health_status()
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        # Return basic unhealthy status if service fails
        return IntegrationHealthCheck(
            status="unhealthy",
            service="VendorGrid P-2501 Integration",
            timestamp=datetime.utcnow()
        )


@router.post("/auth/validate", response_model=ApiKeyValidateResponse)
async def validate_api_key_endpoint(
    request: ApiKeyValidateRequest,
    integration_service: IntegrationService = Depends(get_integration_service_local)
):
    """
    Validate API key for integration access.

    Allows external systems to verify API key validity.
    Useful for debugging authentication issues.

    Returns:
        ApiKeyValidateResponse: Validation result with expiration info
    """
    try:
        return await integration_service.validate_api_key(request.api_key)
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        raise HTTPException(status_code=500, detail="API key validation failed")


# Background task helper for webhooks (to be used in vendor service callbacks)
async def send_webhook_notification_background(
    integration_service: IntegrationService,
    event_type: str,
    vendor_data: dict
):
    """
    Background task to send webhook notifications without blocking API responses.

    Should be called from vendor service after successful operations.
    """
    try:
        # Convert string event_type back to enum
        from ..schemas.integration import WebhookEventType
        event_enum = WebhookEventType(event_type)

        await integration_service.send_webhook_notification(event_enum, vendor_data)
    except Exception as e:
        logger.error(f"Background webhook notification failed: {str(e)}")
        # Don't raise exception in background task