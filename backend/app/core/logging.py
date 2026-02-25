"""Logging setup helpers."""

import logging
import sys


def configure_logging() -> None:
    """Configure structured-ish, production-safe console logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
