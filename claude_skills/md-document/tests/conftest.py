"""Pytest configuration. Add scripts/ to path so tests can import md_to_pdf."""
import os
import sys

scripts_dir = os.path.join(os.path.dirname(__file__), "..", "scripts")
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)
