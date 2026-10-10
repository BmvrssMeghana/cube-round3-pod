"""
Vercel serverless entry point for the CUBE orchestration backend.
Vercel's @vercel/python adapter looks for `app` (ASGI) in this file.
"""
import sys
import os
from pathlib import Path

# Ensure project root is on sys.path so all imports resolve correctly
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load .env if present (for local testing with vercel dev)
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

# Import the FastAPI application
from orchestration.api import app  # noqa: F401 – Vercel picks up `app` automatically

# Vercel also supports a `handler` callable for WSGI/ASGI.
# The `app` name is sufficient for @vercel/python >= 3.x
