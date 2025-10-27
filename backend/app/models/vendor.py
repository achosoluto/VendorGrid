"""
Vendor SQLAlchemy model with tax ID uniqueness constraint.
Using composition for database session management and focusing on single responsibility (data definition).
"""

from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Vendor(Base):
    """
    Represents a vendor entity in the database.

    Attributes:
        id (int): Primary key identifier
        name (str): Vendor name
        tax_id (str): Unique tax identifier (e.g., GST/HST number)
        address (str): Physical address
        contact_email (str): Primary contact email
        created_at (datetime): Record creation timestamp
        updated_at (datetime): Last update timestamp

    Constraints:
        - tax_id is unique across all vendors to prevent duplicates
    """
    __tablename__ = 'vendors'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)     # Indexed for search performance
    tax_id = Column(String, nullable=False, index=True)  # Indexed for performance
    address = Column(String, index=True)                  # Indexed for search performance
    contact_email = Column(String, index=True)            # Indexed for search performance
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Unique constraint on tax_id to ensure no duplicates
    __table_args__ = (
        UniqueConstraint('tax_id', name='uix_vendor_tax_id'),
    )

    def __repr__(self):
        return f"<Vendor(id={self.id}, name='{self.name}', tax_id='{self.tax_id}')>"