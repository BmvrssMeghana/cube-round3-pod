"""
File storage — Supabase Storage.

Uploads images to a Supabase Storage bucket and returns public URLs.
The public URL is stored in the database instead of a local path.

For the AI inspection, images are downloaded to a temp file,
read by the vision model, then the temp file is deleted.
"""
from __future__ import annotations

import tempfile
import uuid
from pathlib import Path

import httpx
from fastapi import UploadFile
from supabase import create_client, Client

from config import SUPABASE_BUCKET, SUPABASE_SERVICE_KEY, SUPABASE_URL


def _get_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def _unique_filename(original: str) -> str:
    ext = Path(original).suffix.lower() or ".jpg"
    return f"{uuid.uuid4().hex}{ext}"


import logging

logger = logging.getLogger(__name__)

async def save_packing_photo(file: UploadFile, order_id: int) -> str:
    """
    Upload the packing photo to Supabase Storage.
    Returns the public URL.
    """
    try:
        filename = f"packing/order_{order_id}_{_unique_filename(file.filename or 'photo.jpg')}"
        contents = await file.read()

        client = _get_client()
        client.storage.from_(SUPABASE_BUCKET).upload(
            path=filename,
            file=contents,
            file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"},
        )

        url = client.storage.from_(SUPABASE_BUCKET).get_public_url(filename)
        return url
    except Exception as exc:
        logger.exception("Failed to upload packing photo for order_id=%s: %s", order_id, exc)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {exc}")


async def save_return_photo(file: UploadFile, return_id: int) -> str:
    """
    Upload the returned product photo to Supabase Storage.
    Returns the public URL.
    """
    try:
        filename = f"returns/return_{return_id}_{_unique_filename(file.filename or 'photo.jpg')}"
        contents = await file.read()

        client = _get_client()
        client.storage.from_(SUPABASE_BUCKET).upload(
            path=filename,
            file=contents,
            file_options={"content-type": file.content_type or "image/jpeg", "upsert": "true"},
        )

        url = client.storage.from_(SUPABASE_BUCKET).get_public_url(filename)
        return url
    except Exception as exc:
        logger.exception("Failed to upload return photo for return_id=%s: %s", return_id, exc)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {exc}")


def download_to_tempfile(url: str) -> str:
    """
    Download an image from a Supabase public URL to a local temp file.
    Returns the temp file path. Caller is responsible for deleting it.
    """
    response = httpx.get(url, timeout=30, follow_redirects=True)
    response.raise_for_status()

    # Determine extension from content-type
    content_type = response.headers.get("content-type", "image/jpeg")
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png":  ".png",
        "image/webp": ".webp",
        "image/gif":  ".gif",
    }
    ext = ext_map.get(content_type.split(";")[0].strip(), ".jpg")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    tmp.write(response.content)
    tmp.close()
    return tmp.name


def url_exists(url: str | None) -> bool:
    """Check whether a Supabase Storage URL is accessible."""
    if not url:
        return False
    try:
        r = httpx.head(url, timeout=10, follow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False
