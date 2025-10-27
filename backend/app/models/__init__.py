"""
Models package initialization.
Provides access to all database models.
"""

from .vendor import Vendor, Base

__all__ = ['Vendor', 'Base']