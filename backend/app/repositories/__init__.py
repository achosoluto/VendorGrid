"""
Repositories package initialization.
Provides access to all repository implementations.
"""

from .base import BaseRepository
from .vendor_repository import VendorRepository

__all__ = ['BaseRepository', 'VendorRepository']