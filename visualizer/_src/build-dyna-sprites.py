#!/usr/bin/env python3
"""DynaFlare / catalog fx builder. Source of truth: adapt-piu-fx.py (piu photos)."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("adapt-piu-fx.py")), run_name="__main__")
