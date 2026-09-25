import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Property(Base):
    __tablename__ = "properties"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, default="Main Home")
    address = Column(String(255), nullable=True)
    currency_symbol = Column(String(10), default="£")
    created_at = Column(DateTime, default=datetime.utcnow)

    bills = relationship("BillRecord", back_populates="property", cascade="all, delete-orphan")
    meter_readings = relationship("MeterReading", back_populates="property", cascade="all, delete-orphan")
    tariffs = relationship("TariffPlan", back_populates="property", cascade="all, delete-orphan")
    accounts = relationship("UtilityAccount", back_populates="property", cascade="all, delete-orphan")

class UtilityAccount(Base):
    __tablename__ = "utility_accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    property_id = Column(String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    utility_type = Column(String(50), nullable=False)  # ELECTRICITY, GAS, WATER, COUNCIL_TAX, BROADBAND, ESTATE_SERVICE_CHARGE
    meter_type = Column(String(20), default="KWH")  # KWH, M3, IMPERIAL_100CF
    provider_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="accounts")

class TariffPlan(Base):
    __tablename__ = "tariff_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    property_id = Column(String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    utility_type = Column(String(50), nullable=False)  # ELECTRICITY, GAS, WATER, COUNCIL_TAX, BROADBAND, ESTATE_SERVICE_CHARGE
    name = Column(String(100), nullable=False)  # e.g., "Standard Variable 2025"
    valid_from = Column(Date, nullable=False, default=date.today)
    valid_to = Column(Date, nullable=True)
    unit_rate = Column(Float, nullable=True, default=None)  # £ per kWh or m3 (optional for variable/tracker tariffs)
    standing_charge = Column(Float, nullable=False, default=0.0)  # £ per day
    vat_rate = Column(Float, default=0.05)  # 5% UK domestic VAT
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="tariffs")

class BillRecord(Base):
    __tablename__ = "bill_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    property_id = Column(String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    utility_type = Column(String(50), nullable=False)  # ELECTRICITY, GAS, WATER, COUNCIL_TAX, BROADBAND, ESTATE_SERVICE_CHARGE
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    total_units = Column(Float, nullable=False)  # Standardized: kWh for electricity & gas, m3 for water, 0 for fixed fees
    raw_meter_units = Column(Float, nullable=True)  # e.g. m3 for gas before conversion
    raw_unit_type = Column(String(20), nullable=True)  # "M3", "KWH"
    total_cost = Column(Float, nullable=False)
    standing_charge_cost = Column(Float, nullable=True)
    unit_rate_cost = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(50), default="MANUAL")  # MANUAL, CSV_IMPORT, SEED_DATA
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="bills")

class MeterReading(Base):
    __tablename__ = "meter_readings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    property_id = Column(String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    utility_type = Column(String(50), nullable=False)  # ELECTRICITY, GAS, WATER, COUNCIL_TAX, BROADBAND, ESTATE_SERVICE_CHARGE
    reading_date = Column(Date, nullable=False)
    meter_index = Column(Float, nullable=False)
    meter_unit = Column(String(20), default="KWH")  # KWH, M3
    reading_type = Column(String(20), default="ACTUAL")  # ACTUAL, ESTIMATED, SMART
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="meter_readings")

class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
