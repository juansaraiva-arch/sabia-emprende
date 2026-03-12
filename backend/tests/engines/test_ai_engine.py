"""
Tests para ai_engine.py — Motor centralizado de Claude API.
Usa mocks para no depender de la API real.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestSafeJsonParse:
    """Tests para _safe_json_parse."""

    def test_valid_json(self):
        from app.engines.ai_engine import _safe_json_parse
        result = _safe_json_parse('{"key": "value", "num": 42}')
        assert result == {"key": "value", "num": 42}

    def test_json_with_markdown_block(self):
        from app.engines.ai_engine import _safe_json_parse
        text = 'Aqui esta el resultado:\n```json\n{"total": 100}\n```\nListo.'
        result = _safe_json_parse(text)
        assert result == {"total": 100}

    def test_json_embedded_in_text(self):
        from app.engines.ai_engine import _safe_json_parse
        text = 'El resultado es {"monto": 50.5, "tipo": "gasto"} como puedes ver.'
        result = _safe_json_parse(text)
        assert result == {"monto": 50.5, "tipo": "gasto"}

    def test_invalid_json_returns_raw(self):
        from app.engines.ai_engine import _safe_json_parse
        result = _safe_json_parse("esto no es json")
        assert "raw_response" in result
        assert "error" in result

    def test_empty_string(self):
        from app.engines.ai_engine import _safe_json_parse
        result = _safe_json_parse("")
        assert "raw_response" in result or "error" in result

    def test_whitespace_json(self):
        from app.engines.ai_engine import _safe_json_parse
        result = _safe_json_parse('  {"ok": true}  ')
        assert result == {"ok": True}


class TestGetClaude:
    """Tests para get_claude singleton."""

    @patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}, clear=False)
    def test_missing_api_key_raises(self):
        from app.engines.ai_engine import get_claude
        # Clear lru_cache
        get_claude.cache_clear()
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            get_claude()
        assert exc_info.value.status_code == 500
        assert "ANTHROPIC_API_KEY" in exc_info.value.detail

    def test_placeholder_for_missing_package(self):
        """Placeholder — no se puede testear sin desinstalar el paquete."""
        pass


class TestClaudeJson:
    """Tests para claude_json."""

    @patch("app.engines.ai_engine.get_claude")
    def test_returns_parsed_json(self, mock_get_claude):
        from app.engines.ai_engine import claude_json

        # Mock the Claude response
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"total": 150.50, "itbms": 10.54}')]
        mock_get_claude.return_value.messages.create.return_value = mock_response

        result = claude_json("System prompt", "User content")
        assert result["total"] == 150.50
        assert result["itbms"] == 10.54

    @patch("app.engines.ai_engine.get_claude")
    def test_system_prompt_includes_json_instruction(self, mock_get_claude):
        from app.engines.ai_engine import claude_json

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"ok": true}')]
        mock_get_claude.return_value.messages.create.return_value = mock_response

        claude_json("Eres un contador", "Analiza esto")

        # Verify that system prompt includes JSON instruction
        call_kwargs = mock_get_claude.return_value.messages.create.call_args
        system = call_kwargs.kwargs.get("system", "")
        assert "JSON" in system
        assert "Eres un contador" in system


class TestClaudeText:
    """Tests para claude_text."""

    @patch("app.engines.ai_engine.get_claude")
    def test_returns_text(self, mock_get_claude):
        from app.engines.ai_engine import claude_text

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Tu negocio esta saludable.")]
        mock_get_claude.return_value.messages.create.return_value = mock_response

        result = claude_text("System prompt", "Como esta mi negocio?")
        assert result == "Tu negocio esta saludable."

    @patch("app.engines.ai_engine.get_claude")
    def test_includes_history(self, mock_get_claude):
        from app.engines.ai_engine import claude_text

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Respuesta")]
        mock_get_claude.return_value.messages.create.return_value = mock_response

        history = [
            {"role": "user", "content": "Hola"},
            {"role": "assistant", "content": "Hola, como te ayudo?"},
        ]
        claude_text("System", "Pregunta nueva", history=history)

        call_kwargs = mock_get_claude.return_value.messages.create.call_args
        messages = call_kwargs.kwargs.get("messages", [])
        # Should have 3 messages: 2 history + 1 current
        assert len(messages) == 3
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"
        assert messages[2]["content"] == "Pregunta nueva"


class TestClaudeVision:
    """Tests para claude_vision."""

    @patch("app.engines.ai_engine.get_claude")
    def test_returns_parsed_json_from_image(self, mock_get_claude):
        from app.engines.ai_engine import claude_vision

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"total": 50.00, "proveedor": "Super 99"}')]
        mock_get_claude.return_value.messages.create.return_value = mock_response

        result = claude_vision(
            system_prompt="Analiza factura",
            image_b64="base64data",
            mime_type="image/jpeg",
        )
        assert result["total"] == 50.00
        assert result["proveedor"] == "Super 99"

    @patch("app.engines.ai_engine.get_claude")
    def test_sends_image_block(self, mock_get_claude):
        from app.engines.ai_engine import claude_vision

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"ok": true}')]
        mock_get_claude.return_value.messages.create.return_value = mock_response

        claude_vision(
            system_prompt="Analiza",
            image_b64="b64data",
            mime_type="image/png",
            user_text="Que ves?",
        )

        call_kwargs = mock_get_claude.return_value.messages.create.call_args
        messages = call_kwargs.kwargs.get("messages", [])
        assert len(messages) == 1
        content = messages[0]["content"]
        assert isinstance(content, list)
        assert content[0]["type"] == "image"
        assert content[0]["source"]["type"] == "base64"
        assert content[0]["source"]["media_type"] == "image/png"
        assert content[1]["type"] == "text"
