"""
Integration service for P-2501 API operations.
Encapsulates business logic for clean JSON APIs and webhooks.
Composition over inheritance, focusing on single responsibility per method.
"""

import aiohttp
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from .vendor_service import VendorService
from ..schemas.integration import (
    IntegrationVendorRead,
    VendorChange,
    VendorChangesResponse,
    WebhookPayload,
    WebhookEventType,
    IntegrationHealthCheck,
    ApiKeyValidateResponse
)
from ..repositories.vendor_repository import VendorRepository

logger = logging.getLogger(__name__)


class IntegrationService:
    """
    Service layer for P-2501 integration operations.
    Handles structured data export, change tracking, and webhook notifications.
    Designed with composition - depends on VendorService rather than inheriting.
    """

    def __init__(self,
                 vendor_service: VendorService,
                 webhook_url: Optional[str] = None,
                 webhook_timeout: int = 30):
        """
        Initialize integration service.

        Args:
            vendor_service: Composed vendor service for data operations
            webhook_url: Optional external webhook URL for notifications
            webhook_timeout: Timeout in seconds for webhook requests
        """
        self.vendor_service = vendor_service
        self.webhook_url = webhook_url
        self.webhook_timeout = webhook_timeout
        self._webhook_session = None

    async def get_vendors_for_integration(self) -> List[IntegrationVendorRead]:
        """
        Get all vendors in format optimized for P-2501 AI consumption.
        Returns clean, structured JSON data.

        Returns:
            List of vendors formatted for AI processing
        """
        vendors = await self.vendor_service.get_all_vendors()

        # Transform to integration format
        integration_vendors = []
        for vendor in vendors:
            integration_vendor = IntegrationVendorRead(
                id=vendor.id,
                name=vendor.name,
                tax_id=vendor.tax_id,
                status="active",  # Default status since model doesn't have status field yet
                address=vendor.address,
                contact_email=vendor.contact_email,
                created_at=vendor.created_at,
                updated_at=vendor.updated_at
            )
            integration_vendors.append(integration_vendor)

        return integration_vendors

    async def get_vendor_changes_since(self,
                                     since_timestamp: datetime,
                                     page: int = 1,
                                     page_size: int = 50) -> VendorChangesResponse:
        """
        Get vendor changes since a specific timestamp.
        Implements time-based delta updates for efficient data synchronization.

        Args:
            since_timestamp: Timestamp to get changes after
            page: Page number for pagination
            page_size: Number of items per page

        Returns:
            Paginated response with change information
        """
        # For MVP, we'll simulate changes based on updated_at timestamps
        # In a full implementation, this would track actual audit log changes
        all_vendors = await self.vendor_service.get_all_vendors()

        # Filter vendors updated since the timestamp
        changed_vendors = [
            vendor for vendor in all_vendors
            if vendor.updated_at > since_timestamp
        ]

        # Paginate results
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_vendors = changed_vendors[start_index:end_index]

        # Convert to change format (simplified for MVP)
        changes = []
        for vendor in paginated_vendors:
            change = VendorChange(
                vendor_id=vendor.id,
                change_type="updated",  # Simplified assumption
                changed_fields=None,  # Would need audit log for actual field tracking
                timestamp=vendor.updated_at,
                vendor_data=IntegrationVendorRead(
                    id=vendor.id,
                    name=vendor.name,
                    tax_id=vendor.tax_id,
                    status="active",
                    address=vendor.address,
                    contact_email=vendor.contact_email,
                    created_at=vendor.created_at,
                    updated_at=vendor.updated_at
                )
            )
            changes.append(change)

        total_pages = (len(changed_vendors) + page_size - 1) // page_size

        return VendorChangesResponse(
            changes=changes,
            total_changes=len(changed_vendors),
            since_timestamp=since_timestamp,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    async def send_webhook_notification(self,
                                       event_type: WebhookEventType,
                                       data: Dict[str, Any]) -> bool:
        """
        Send webhook notification to external systems.
        Implements fire-and-forget pattern with proper error handling.

        Args:
            event_type: Type of event being notified
            data: Event-specific data payload

        Returns:
            True if webhook sent successfully, False otherwise
        """
        if not self.webhook_url:
            logger.info("Webhook URL not configured, skipping notification")
            return True  # Consider as successful when not configured

        webhook_payload = WebhookPayload(
            event_type=event_type,
            event_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            data=data,
            source="vendorgrid"
        )

        try:
            # Create session if not exists (connection pooling)
            if not self._webhook_session:
                self._webhook_session = aiohttp.ClientSession(
                    timeout=aiohttp.ClientTimeout(total=self.webhook_timeout)
                )

            async with self._webhook_session.post(
                self.webhook_url,
                json=webhook_payload.dict(),
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status in (200, 201, 202):
                    logger.info(f"Webhook notification sent successfully: {event_type}")
                    return True
                else:
                    logger.warning(f"Webhook delivery failed with status {response.status}")
                    return False

        except Exception as e:
            logger.error(f"Error sending webhook notification: {str(e)}")
            return False

    async def notify_vendor_created(self, vendor_data: IntegrationVendorRead) -> None:
        """Notify external systems when a vendor is created."""
        await self.send_webhook_notification(
            WebhookEventType.VENDOR_CREATED,
            {"vendor": vendor_data.dict()}
        )

    async def notify_vendor_updated(self, vendor_data: IntegrationVendorRead) -> None:
        """Notify external systems when a vendor is updated."""
        await self.send_webhook_notification(
            WebhookEventType.VENDOR_UPDATED,
            {"vendor": vendor_data.dict()}
        )

    async def notify_vendor_deleted(self, vendor_id: int) -> None:
        """Notify external systems when a vendor is deleted."""
        await self.send_webhook_notification(
            WebhookEventType.VENDOR_DELETED,
            {"vendor_id": vendor_id}
        )

    async def notify_import_completed(self, import_result: Dict[str, Any]) -> None:
        """Notify external systems when a bulk import is completed."""
        await self.send_webhook_notification(
            WebhookEventType.VENDOR_IMPORTED,
            import_result
        )

    async def get_health_status(self) -> IntegrationHealthCheck:
        """
        Get health status of integration services.
        Includes basic metrics for monitoring.

        Returns:
            Health check response with current status
        """
        try:
            vendors = await self.vendor_service.get_all_vendors()
            last_updated = max((v.updated_at for v in vendors), default=None) if vendors else None

            return IntegrationHealthCheck(
                status="healthy",
                service="VendorGrid P-2501 Integration",
                timestamp=datetime.utcnow(),
                total_vendors=len(vendors),
                last_updated=last_updated
            )
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return IntegrationHealthCheck(
                status="unhealthy",
                service="VendorGrid P-2501 Integration",
                timestamp=datetime.utcnow()
            )

    async def validate_api_key(self, api_key: str) -> ApiKeyValidateResponse:
        """
        Validate API key for integration access.
        Basic implementation - in production, this would check against a secure store.

        Args:
            api_key: The API key to validate

        Returns:
            Validation response with status and expiration info
        """
        # MVP implementation - accept any non-empty key
        # In production, implement proper key validation with database
        if api_key and len(api_key.strip()) > 0:
            return ApiKeyValidateResponse(
                valid=True,
                message="API key is valid",
                expires_at=None  # No expiration for MVP
            )

        return ApiKeyValidateResponse(
            valid=False,
            message="Invalid or missing API key"
        )

    async def close(self) -> None:
        """Clean up resources like HTTP sessions."""
        if self._webhook_session:
            await self._webhook_session.close()
            self._webhook_session = None