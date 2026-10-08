"""
AI provider abstraction.

All AI vision calls go through this module.
To swap providers, change AI_PROVIDER in .env.

Supported providers:
  - openai  (default) — uses GPT-4o vision
  - anthropic         — uses Claude 3.5 Sonnet
  - mock              — returns deterministic fake results (for dev/testing)
"""
from __future__ import annotations

import base64
import json
import logging
from pathlib import Path

from config import (
    AI_PROVIDER,
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------


def _extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from a model response.
    Handles plain JSON, markdown fences, leading whitespace/prose,
    and newlines before the opening brace.
    """
    text = text.strip()

    # Strip markdown code fences  ```json ... ```  or  ``` ... ```
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 2:
            inner = parts[1]
            if inner.startswith("json"):
                inner = inner[4:]
            text = inner.strip()

    # Find the outermost { ... } block in case there is surrounding prose
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    return json.loads(text)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _encode_image(path: str) -> str:
    """Return a base64-encoded image string."""
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def _image_media_type(path: str) -> str:
    ext = Path(path).suffix.lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }.get(ext, "image/jpeg")


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

INSPECTION_PROMPT = """You are an expert product return inspector AI.

You will be given two images:
1. ORIGINAL PACKING IMAGE — taken before shipment (the reference).
2. RETURNED PRODUCT IMAGE — submitted by the customer.

Your task is to compare both images and produce a structured JSON inspection report.

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "product_match": true | false,
  "missing_parts": ["list of missing item names, empty if none"],
  "damage": [
    {{"type": "damage description", "severity": "low|medium|high", "confidence": 0.0-1.0}}
  ],
  "scratches": [
    {{"location": "location description", "severity": "minor|moderate|severe"}}
  ],
  "return_reason_supported": true | false,
  "damage_level": "NONE" | "LOW" | "MEDIUM" | "HIGH",
  "confidence": 0.0-1.0,
  "recommendation": "ACCEPT" | "REJECT" | "MANUAL_REVIEW",
  "evidence": ["short factual statement 1", "short factual statement 2"]
}}

Rules:
- Be objective and evidence-based.
- Do not speculate beyond what is visible.
- Keep evidence statements concise (max 15 words each).
- The customer's stated return reason is: {return_reason}
- Required components for this product are: {required_components}
- If you cannot clearly determine something, use a lower confidence score.
"""


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------


def _analyze_with_openai(
    original_image_path: str,
    returned_image_path: str,
    return_reason: str,
    required_components: list[str],
) -> dict:
    try:
        import httpx
        from openai import OpenAI  # type: ignore
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai")

    # Explicitly construct the http_client to avoid the 'proxies' kwarg conflict
    # that occurs with certain httpx versions in some environments.
    client = OpenAI(
        api_key=OPENAI_API_KEY,
        http_client=httpx.Client(),
    )

    original_b64 = _encode_image(original_image_path)
    returned_b64 = _encode_image(returned_image_path)
    orig_media = _image_media_type(original_image_path)
    ret_media = _image_media_type(returned_image_path)

    prompt = INSPECTION_PROMPT.format(
        return_reason=return_reason,
        required_components=", ".join(required_components) if required_components else "none specified",
    )

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{orig_media};base64,{original_b64}", "detail": "high"},
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{ret_media};base64,{returned_b64}", "detail": "high"},
                    },
                ],
            }
        ],
        max_tokens=1024,
    )

    raw = response.choices[0].message.content or ""
    logger.debug("OpenAI raw response: %s", raw)
    return _extract_json(raw)


def _analyze_with_anthropic(
    original_image_path: str,
    returned_image_path: str,
    return_reason: str,
    required_components: list[str],
) -> dict:
    try:
        import anthropic  # type: ignore
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    original_b64 = _encode_image(original_image_path)
    returned_b64 = _encode_image(returned_image_path)
    orig_media = _image_media_type(original_image_path)
    ret_media = _image_media_type(returned_image_path)

    prompt = INSPECTION_PROMPT.format(
        return_reason=return_reason,
        required_components=", ".join(required_components) if required_components else "none specified",
    )

    response = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": orig_media, "data": original_b64},
                    },
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": ret_media, "data": returned_b64},
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    # Extract JSON from the text response
    text = response.content[0].text
    return _extract_json(text)


def _analyze_with_gemini(
    original_image_path: str,
    returned_image_path: str,
    return_reason: str,
    required_components: list[str],
) -> dict:
    """
    Call Gemini via the REST API directly.
    Supports both AIza... API keys and AQ.... OAuth2 access tokens.
    """
    import urllib.request
    import urllib.error

    key = GEMINI_API_KEY
    model = GEMINI_MODEL

    prompt = INSPECTION_PROMPT.format(
        return_reason=return_reason,
        required_components=", ".join(required_components) if required_components else "none specified",
    )

    orig_b64  = _encode_image(original_image_path)
    ret_b64   = _encode_image(returned_image_path)
    orig_mime = _image_media_type(original_image_path)
    ret_mime  = _image_media_type(returned_image_path)

    body = json.dumps({
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": orig_mime, "data": orig_b64}},
                {"inline_data": {"mime_type": ret_mime,  "data": ret_b64}},
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
        }
    }).encode("utf-8")

    # Choose auth method based on key format
    if key.startswith("AIza"):
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={key}"
        )
        headers = {"Content-Type": "application/json"}
    else:
        # OAuth2 access token (AQ.Ab8... format)
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent"
        )
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        }

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        logger.error("Gemini API error %s: %s", e.code, error_body)
        raise RuntimeError(f"Gemini API returned {e.code}: {error_body}")

    # Extract text from response
    try:
        raw = result["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Gemini response structure: {result}")

    logger.debug("Gemini raw response: %s", raw)
    return _extract_json(raw)


def _analyze_with_openrouter(
    original_image_path: str,
    returned_image_path: str,
    return_reason: str,
    required_components: list[str],
) -> dict:
    """
    Call any vision model via OpenRouter.
    OpenRouter is OpenAI-API-compatible so we use the openai SDK
    pointed at https://openrouter.ai/api/v1
    """
    try:
        import httpx
        from openai import OpenAI  # type: ignore
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai")

    client = OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
        http_client=httpx.Client(),
        default_headers={
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Return Manager",
        },
    )

    original_b64 = _encode_image(original_image_path)
    returned_b64 = _encode_image(returned_image_path)
    orig_media   = _image_media_type(original_image_path)
    ret_media    = _image_media_type(returned_image_path)

    prompt = INSPECTION_PROMPT.format(
        return_reason=return_reason,
        required_components=", ".join(required_components) if required_components else "none specified",
    )

    response = client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{orig_media};base64,{original_b64}",
                            "detail": "high",
                        },
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{ret_media};base64,{returned_b64}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        max_tokens=1024,
    )

    raw = response.choices[0].message.content or ""
    logger.debug("OpenRouter raw response: %s", raw)
    return _extract_json(raw)


def _analyze_mock(
    original_image_path: str,
    returned_image_path: str,
    return_reason: str,
    required_components: list[str],
) -> dict:
    """
    Deterministic mock response for local development and testing.
    Does not call any external API.
    """
    logger.info("Using MOCK AI provider — no real AI analysis performed.")
    return {
        "product_match": True,
        "missing_parts": [],
        "damage": [
            {"type": "screen_crack", "severity": "high", "confidence": 0.96}
        ],
        "scratches": [
            {"location": "back_panel", "severity": "minor"}
        ],
        "return_reason_supported": True,
        "damage_level": "HIGH",
        "confidence": 0.94,
        "recommendation": "MANUAL_REVIEW",
        "evidence": [
            "Original screen was intact.",
            "Returned image shows a visible screen crack.",
            "Minor scratches detected on the back panel.",
            "Customer-stated reason (screen damage) is consistent with findings.",
        ],
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze_return_images(
    original_image_path: str,
    returned_image_path: str,
    return_reason: str,
    required_components: list[str],
) -> dict:
    """
    Run AI inspection comparing original and returned product images.
    Routes to the configured provider (openai | anthropic | mock).
    """
    provider = AI_PROVIDER.lower()
    logger.info("Running AI inspection with provider: %s", provider)

    if provider == "gemini":
        return _analyze_with_gemini(
            original_image_path, returned_image_path, return_reason, required_components
        )
    elif provider == "openrouter":
        return _analyze_with_openrouter(
            original_image_path, returned_image_path, return_reason, required_components
        )
    elif provider == "openai":
        return _analyze_with_openai(
            original_image_path, returned_image_path, return_reason, required_components
        )
    elif provider == "anthropic":
        return _analyze_with_anthropic(
            original_image_path, returned_image_path, return_reason, required_components
        )
    elif provider == "mock":
        return _analyze_mock(
            original_image_path, returned_image_path, return_reason, required_components
        )
    else:
        raise ValueError(f"Unknown AI provider: {provider}. Use 'openrouter', 'gemini', 'openai', 'anthropic', or 'mock'.")
