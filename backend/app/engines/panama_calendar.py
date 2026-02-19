"""
Calendario de Panama 2026
Feriados nacionales, dias laborables, deteccion de recargos.
Port de frontend/src/lib/panama-calendar.ts a Python (stdlib).
"""
from datetime import date, timedelta
import calendar


# ==============================================================
# FERIADOS NACIONALES PANAMA 2026
# ==============================================================

FERIADOS_PANAMA_2026: list[tuple[date, str]] = [
    (date(2026, 1, 1), "Ano Nuevo"),
    (date(2026, 1, 9), "Dia de los Martires"),
    # Carnaval 2026: 14-17 febrero (sabado-martes antes de Miercoles de Ceniza)
    (date(2026, 2, 14), "Carnaval (Sabado)"),
    (date(2026, 2, 15), "Carnaval (Domingo)"),
    (date(2026, 2, 16), "Carnaval (Lunes)"),
    (date(2026, 2, 17), "Carnaval (Martes)"),
    (date(2026, 4, 2), "Jueves Santo"),
    (date(2026, 4, 3), "Viernes Santo"),
    (date(2026, 5, 1), "Dia del Trabajo"),
    (date(2026, 11, 3), "Separacion de Colombia"),
    (date(2026, 11, 4), "Dia de la Bandera"),
    (date(2026, 11, 5), "Consolidacion Separatista"),
    (date(2026, 11, 10), "Grito de Independencia"),
    (date(2026, 11, 28), "Independencia de Espana"),
    (date(2026, 12, 8), "Dia de las Madres"),
    (date(2026, 12, 25), "Navidad"),
]

# Set para busqueda rapida O(1)
_FERIADOS_SET: dict[date, str] = {f: n for f, n in FERIADOS_PANAMA_2026}


def es_feriado(fecha: date) -> str | None:
    """Retorna nombre del feriado o None si es dia normal."""
    return _FERIADOS_SET.get(fecha)


def es_domingo(fecha: date) -> bool:
    """Verifica si la fecha es domingo."""
    return fecha.weekday() == 6


def dias_laborables(year: int, month: int) -> int:
    """
    Calcula dias laborables en un mes.
    Excluye domingos y feriados nacionales.
    Solo cuenta lunes a sabado que no sean feriados.
    """
    num_days = calendar.monthrange(year, month)[1]
    count = 0
    for day in range(1, num_days + 1):
        fecha = date(year, month, day)
        if not es_domingo(fecha) and not es_feriado(fecha):
            count += 1
    return count


def tipo_recargo(fecha: date) -> str | None:
    """
    Determina el tipo de recargo laboral para una fecha.
    - 'feriado' -> 150% recargo
    - 'domingo' -> 50% recargo
    - None -> dia normal (sin recargo)
    """
    if es_feriado(fecha):
        return "feriado"
    if es_domingo(fecha):
        return "domingo"
    return None


def get_feriados_mes(year: int, month: int) -> list[tuple[date, str]]:
    """Retorna lista de feriados en un mes especifico."""
    return [
        (f, n) for f, n in FERIADOS_PANAMA_2026
        if f.year == year and f.month == month
    ]
