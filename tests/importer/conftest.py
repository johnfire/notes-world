"""pytest configuration for importer tests."""

import os
import sys
from pathlib import Path

# Add src/ to path so `from importer.xxx import ...` works without install
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / 'src'))

FIXTURES = Path(__file__).parent / 'fixtures'
