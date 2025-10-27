"""
FastAPI application entry point with dependency injection and HTML UI.
Uses composition for service injection and focuses on REST API and web interface routing.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db_session
from .repositories.vendor_repository import VendorRepository
from .services.vendor_service import VendorService
from .services.integration_service import IntegrationService
from .routes.vendor_routes import router as vendor_router
from .routes.integration_routes import router as integration_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for database initialization.
    Creates tables on startup.
    """
    from .models.vendor import Base
    from .database import async_engine

    # Create tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    # Cleanup (if needed)


# Create FastAPI app with lifespan
app = FastAPI(
    title="VendorGrid P-2501 Integration API",
    description="Enterprise vendor management with clean JSON APIs for P-2501 integration",
    version="1.0.0",
    lifespan=lifespan
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Dependency injection functions
async def get_vendor_repository(session: AsyncSession = Depends(get_db_session)) -> VendorRepository:
    """Dependency injection for vendor repository."""
    return VendorRepository(session)

async def get_vendor_service(repository: VendorRepository = Depends(get_vendor_repository)) -> VendorService:
    """Dependency injection for vendor service."""
    return VendorService(repository)

async def get_integration_service(vendor_service: VendorService = Depends(get_vendor_service)) -> IntegrationService:
    """Dependency injection for integration service."""
    # TODO: Add webhook URL configuration
    return IntegrationService(vendor_service, webhook_url=None)

# Include API routes with versioning
app.include_router(vendor_router, prefix="/api/v1", tags=["Vendor Management"])
app.include_router(integration_router, prefix="/api/v1/integration", tags=["P-2501 Integration"])

# Web UI routes
@app.get("/", response_class=HTMLResponse)
async def root(request: Request, service: VendorService = Depends(get_vendor_service)):
    """Serve the main vendor management page."""
    vendors = await service.get_all_vendors()
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "vendors": vendors}
    )

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Enterprise MDM MVP"}