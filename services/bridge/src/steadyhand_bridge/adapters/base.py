"""Base device adapter interface."""

from abc import ABC, abstractmethod
from typing import Optional
from ..contracts import DeviceHello, SensorBatch, DataSource


class BaseDeviceAdapter(ABC):
    """Abstract interface for hardware, mock, or replay sensor adapters."""

    @property
    @abstractmethod
    def source(self) -> DataSource:
        """The canonical data source label ('live', 'recorded', 'synthetic', 'unavailable')."""
        pass

    @abstractmethod
    async def start(self) -> None:
        """Start the adapter stream."""
        pass

    @abstractmethod
    async def stop(self) -> None:
        """Stop and clean up the adapter stream."""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Return True if the adapter is actively connected and producing data."""
        pass

    @abstractmethod
    def get_hello(self) -> DeviceHello:
        """Return the DeviceHello descriptor for this stream."""
        pass

    @abstractmethod
    async def drain_batch(self) -> Optional[SensorBatch]:
        """Drain the next batch of samples (up to 50 samples), or None if none ready."""
        pass
