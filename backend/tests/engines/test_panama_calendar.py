"""
Tests unitarios para panama_calendar.py
Calendario de Panama 2026 — Feriados, dias laborables, recargos
"""
import pytest
from datetime import date
from app.engines.panama_calendar import (
    es_feriado,
    es_domingo,
    dias_laborables,
    tipo_recargo,
    get_feriados_mes,
    FERIADOS_PANAMA_2026,
)


# ============================================================
# es_feriado
# ============================================================

class TestEsFeriado:
    def test_ano_nuevo(self):
        """1 de enero 2026 es Ano Nuevo."""
        assert es_feriado(date(2026, 1, 1)) == "Ano Nuevo"

    def test_dia_martires(self):
        """9 de enero 2026 es Dia de los Martires."""
        assert es_feriado(date(2026, 1, 9)) == "Dia de los Martires"

    def test_carnaval_lunes(self):
        """16 de febrero 2026 es Carnaval (Lunes)."""
        assert es_feriado(date(2026, 2, 16)) == "Carnaval (Lunes)"

    def test_navidad(self):
        """25 de diciembre 2026 es Navidad."""
        assert es_feriado(date(2026, 12, 25)) == "Navidad"

    def test_dia_normal_no_feriado(self):
        """15 de junio 2026 no es feriado."""
        assert es_feriado(date(2026, 6, 15)) is None

    def test_dia_normal_enero(self):
        """2 de enero 2026 no es feriado."""
        assert es_feriado(date(2026, 1, 2)) is None


# ============================================================
# es_domingo
# ============================================================

class TestEsDomingo:
    def test_domingo_enero(self):
        """4 de enero 2026 es domingo."""
        assert es_domingo(date(2026, 1, 4)) is True

    def test_lunes_no_domingo(self):
        """5 de enero 2026 (lunes) no es domingo."""
        assert es_domingo(date(2026, 1, 5)) is False

    def test_sabado_no_domingo(self):
        """3 de enero 2026 (sabado) no es domingo."""
        assert es_domingo(date(2026, 1, 3)) is False


# ============================================================
# dias_laborables
# ============================================================

class TestDiasLaborables:
    def test_enero_2026(self):
        """Enero 2026: 31 dias - 4 domingos (4,11,18,25) - 2 feriados (1,9) = 25."""
        assert dias_laborables(2026, 1) == 25

    def test_febrero_2026(self):
        """Febrero 2026: 28 dias - 4 domingos (1,8,15,22) - carnaval.
        Feriados: 14(sab), 15(dom=ya contado), 16(lun), 17(mar).
        Feb 14 es sabado (no domingo, asi que cuenta como dia laboral que se resta).
        Dias normales: 28 - 4 dom = 24. Luego restar feriados que no son domingo:
        Feb 14 (sab, pero no domingo), Feb 16 (lun), Feb 17 (mar) = 3 feriados extra.
        24 - 3 = 21."""
        result = dias_laborables(2026, 2)
        assert result == 21

    def test_mayo_2026(self):
        """Mayo 2026: 31 dias - 5 domingos (3,10,17,24,31) - 1 feriado (May 1, viernes).
        31 - 5 - 1 = 25."""
        result = dias_laborables(2026, 5)
        assert result == 25

    def test_noviembre_2026(self):
        """Noviembre 2026: muchos feriados patrios.
        Feriados: Nov 3 (mar), 4 (mie), 5 (jue), 10 (mar), 28 (sab).
        Domingos: 1, 8, 15, 22, 29 = 5.
        30 - 5 dom = 25. Restar 5 feriados (ninguno cae domingo) = 20."""
        result = dias_laborables(2026, 11)
        assert result == 20

    def test_diciembre_2026(self):
        """Diciembre 2026: Feriados: Dec 8 (mar), Dec 25 (vie).
        31 dias - 4 domingos (6,13,20,27) = 27. Restar 2 feriados = 25."""
        result = dias_laborables(2026, 12)
        assert result == 25

    def test_no_es_cero(self):
        """Ningun mes tiene 0 dias laborables."""
        for month in range(1, 13):
            assert dias_laborables(2026, month) > 0


# ============================================================
# tipo_recargo
# ============================================================

class TestTipoRecargo:
    def test_feriado_primero_mayo(self):
        """1 de mayo 2026 -> recargo feriado."""
        assert tipo_recargo(date(2026, 5, 1)) == "feriado"

    def test_domingo_recargo(self):
        """Un domingo normal de 2026 -> recargo domingo."""
        assert tipo_recargo(date(2026, 3, 1)) == "domingo"  # Marzo 1, 2026 es domingo

    def test_dia_normal_sin_recargo(self):
        """Dia laboral normal -> None."""
        assert tipo_recargo(date(2026, 3, 2)) is None  # Marzo 2, 2026 es lunes

    def test_feriado_en_domingo(self):
        """Carnaval domingo (Feb 15) -> feriado (feriado tiene prioridad)."""
        assert tipo_recargo(date(2026, 2, 15)) == "feriado"


# ============================================================
# get_feriados_mes
# ============================================================

class TestGetFeriadosMes:
    def test_enero_tiene_2_feriados(self):
        """Enero 2026 tiene 2 feriados."""
        feriados = get_feriados_mes(2026, 1)
        assert len(feriados) == 2

    def test_febrero_tiene_4_feriados(self):
        """Febrero 2026 tiene 4 feriados (Carnaval)."""
        feriados = get_feriados_mes(2026, 2)
        assert len(feriados) == 4

    def test_noviembre_tiene_5_feriados(self):
        """Noviembre 2026 tiene 5 feriados patrios."""
        feriados = get_feriados_mes(2026, 11)
        assert len(feriados) == 5

    def test_junio_sin_feriados(self):
        """Junio 2026 no tiene feriados nacionales."""
        feriados = get_feriados_mes(2026, 6)
        assert len(feriados) == 0


# ============================================================
# Integridad de datos
# ============================================================

class TestIntegridadDatos:
    def test_total_feriados_2026(self):
        """Panama 2026 tiene 16 feriados nacionales."""
        assert len(FERIADOS_PANAMA_2026) == 16

    def test_todos_los_feriados_en_2026(self):
        """Todos los feriados son del ano 2026."""
        for fecha, _ in FERIADOS_PANAMA_2026:
            assert fecha.year == 2026
