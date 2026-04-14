"""
Unified LLM client supporting multiple providers:
  - OpenAI  (GPT-4o, GPT-4o-mini, etc.)  — text + vision
  - Anthropic (claude-3-haiku, claude-3-5-sonnet, etc.) — text + vision
  - Ollama  (llava, mistral, llama3, etc.) — local, text + vision

Usage:
    from app.utils.llm_client import chat_completion, vision_completion

    # Text chat
    reply = chat_completion("openai", "gpt-4o-mini", messages, api_key="sk-...")

    # Vision (image analysis)
    result = vision_completion("anthropic", "claude-3-haiku-20240307",
                               prompt="Describe this image", image_b64="...",
                               api_key="sk-ant-...")
"""
from __future__ import annotations

import json
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Default Ollama base URL
OLLAMA_DEFAULT_URL = "http://localhost:11434"


# ── Text completion ────────────────────────────────────────────────────────────

def chat_completion(
    provider: str,
    model: str,
    messages: List[Dict],
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """
    Send a chat message list to the chosen provider and return the assistant reply.

    messages format: [{"role": "user"|"assistant"|"system", "content": "..."}]
    """
    provider = provider.lower()

    if provider == "openai":
        return _openai_chat(model, messages, api_key, base_url, temperature, max_tokens)
    elif provider == "anthropic":
        return _anthropic_chat(model, messages, api_key, temperature, max_tokens)
    elif provider == "ollama":
        return _ollama_chat(model, messages, base_url or OLLAMA_DEFAULT_URL, temperature, max_tokens)
    else:
        raise ValueError(f"Unsupported provider: {provider!r}. Choose openai, anthropic, or ollama.")


# ── Vision completion ──────────────────────────────────────────────────────────

def vision_completion(
    provider: str,
    model: str,
    prompt: str,
    image_b64: str,
    image_mime: str = "image/jpeg",
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    temperature: float = 0.4,
    max_tokens: int = 2048,
) -> str:
    """
    Analyze an image with the given prompt.

    image_b64: base64-encoded image bytes (no data URI prefix needed).
    image_mime: MIME type, e.g. "image/jpeg", "image/png".
    """
    provider = provider.lower()

    if provider == "openai":
        return _openai_vision(model, prompt, image_b64, image_mime,
                              api_key, base_url, temperature, max_tokens)
    elif provider == "anthropic":
        return _anthropic_vision(model, prompt, image_b64, image_mime,
                                 api_key, temperature, max_tokens)
    elif provider == "ollama":
        return _ollama_vision(model, prompt, image_b64,
                              base_url or OLLAMA_DEFAULT_URL, temperature, max_tokens)
    else:
        raise ValueError(f"Unsupported provider: {provider!r}.")


# ── OpenAI ─────────────────────────────────────────────────────────────────────

def _openai_chat(model, messages, api_key, base_url, temperature, max_tokens) -> str:
    try:
        from openai import OpenAI  # type: ignore
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai>=1.30.0")

    kwargs: Dict = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url

    client = OpenAI(**kwargs)
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content or ""


def _openai_vision(model, prompt, image_b64, image_mime, api_key, base_url,
                   temperature, max_tokens) -> str:
    try:
        from openai import OpenAI  # type: ignore
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai>=1.30.0")

    kwargs: Dict = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url

    client = OpenAI(**kwargs)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{image_mime};base64,{image_b64}",
                            "detail": "high",
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content or ""


# ── Anthropic ──────────────────────────────────────────────────────────────────

def _split_system(messages: List[Dict]):
    """Separate system messages from user/assistant for Anthropic API."""
    system_parts = []
    chat_msgs = []
    for m in messages:
        if m["role"] == "system":
            system_parts.append(m["content"])
        else:
            chat_msgs.append(m)
    return "\n\n".join(system_parts) or None, chat_msgs


def _anthropic_chat(model, messages, api_key, temperature, max_tokens) -> str:
    try:
        import anthropic  # type: ignore
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic>=0.28.0")

    client = anthropic.Anthropic(api_key=api_key)
    system_prompt, chat_msgs = _split_system(messages)

    kwargs: Dict = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": chat_msgs,
    }
    if system_prompt:
        kwargs["system"] = system_prompt

    resp = client.messages.create(**kwargs)
    return resp.content[0].text if resp.content else ""


def _anthropic_vision(model, prompt, image_b64, image_mime, api_key,
                      temperature, max_tokens) -> str:
    try:
        import anthropic  # type: ignore
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic>=0.28.0")

    client = anthropic.Anthropic(api_key=api_key)
    # Anthropic uses media_type without "image/" prefix for some types,
    # but accepts full "image/jpeg" etc.
    media_type = image_mime  # e.g. "image/jpeg"

    resp = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )
    return resp.content[0].text if resp.content else ""


# ── Ollama ─────────────────────────────────────────────────────────────────────

def _ollama_chat(model, messages, base_url, temperature, max_tokens) -> str:
    import urllib.request  # stdlib — no extra deps

    payload = json.dumps(
        {"model": model, "messages": messages, "stream": False,
         "options": {"temperature": temperature, "num_predict": max_tokens}}
    ).encode()

    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.loads(resp.read().decode())
            return body.get("message", {}).get("content", "")
    except Exception as exc:
        raise RuntimeError(
            f"Ollama request failed ({base_url}). Is Ollama running? Error: {exc}"
        )


def _ollama_vision(model, prompt, image_b64, base_url, temperature, max_tokens) -> str:
    import urllib.request

    payload = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt, "images": [image_b64]}
            ],
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
    ).encode()

    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.loads(resp.read().decode())
            return body.get("message", {}).get("content", "")
    except Exception as exc:
        raise RuntimeError(
            f"Ollama request failed ({base_url}). Is Ollama running? Error: {exc}"
        )
