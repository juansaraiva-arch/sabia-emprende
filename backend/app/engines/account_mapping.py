"""
Matriz de equivalencias contables — Panamá
Mapea conceptos comunes a cuentas DEBE/HABER del plan de cuentas.
Usado por NLP engine y auto-asientos.
"""

# ==============================================================
# PLAN DE CUENTAS DEFAULT — PANAMÁ (codificación decimal)
# ==============================================================
# 1.x Activos
# 2.x Pasivos
# 3.x Patrimonio
# 4.x Ingresos
# 5.x Costos y Gastos
# ==============================================================

DEFAULT_CHART_OF_ACCOUNTS = [
    # --- 1. ACTIVOS ---
    {"code": "1", "name": "Activos", "type": "activo", "level": 1, "is_header": True, "normal_balance": "debe"},

    {"code": "1.1", "name": "Activo Corriente", "type": "activo", "level": 2, "is_header": True, "parent": "1", "normal_balance": "debe"},
    {"code": "1.1.1", "name": "Caja y Bancos", "type": "activo", "level": 3, "parent": "1.1", "normal_balance": "debe"},
    {"code": "1.1.2", "name": "Cuentas por Cobrar", "type": "activo", "level": 3, "parent": "1.1", "normal_balance": "debe"},
    {"code": "1.1.3", "name": "Inventario", "type": "activo", "level": 3, "parent": "1.1", "normal_balance": "debe"},
    {"code": "1.1.4", "name": "Anticipos a Proveedores", "type": "activo", "level": 3, "parent": "1.1", "normal_balance": "debe"},
    {"code": "1.1.5", "name": "ITBMS por Cobrar (Credito Fiscal)", "type": "activo", "level": 3, "parent": "1.1", "normal_balance": "debe"},
    {"code": "1.1.6", "name": "Pagos Anticipados", "type": "activo", "level": 3, "parent": "1.1", "normal_balance": "debe"},

    {"code": "1.2", "name": "Activo No Corriente", "type": "activo", "level": 2, "is_header": True, "parent": "1", "normal_balance": "debe"},
    {"code": "1.2.1", "name": "Mobiliario y Equipo", "type": "activo", "level": 3, "parent": "1.2", "normal_balance": "debe"},
    {"code": "1.2.2", "name": "Equipo de Computo", "type": "activo", "level": 3, "parent": "1.2", "normal_balance": "debe"},
    {"code": "1.2.3", "name": "Vehiculos", "type": "activo", "level": 3, "parent": "1.2", "normal_balance": "debe"},
    {"code": "1.2.4", "name": "Depreciacion Acumulada", "type": "activo", "level": 3, "parent": "1.2", "normal_balance": "haber"},
    {"code": "1.2.5", "name": "Depositos en Garantia", "type": "activo", "level": 3, "parent": "1.2", "normal_balance": "debe"},
    {"code": "1.2.6", "name": "Activos Intangibles (Software, Licencias)", "type": "activo", "level": 3, "parent": "1.2", "normal_balance": "debe"},
    {"code": "1.2.7", "name": "Mejoras a Propiedad Arrendada", "type": "activo", "level": 3, "parent": "1.2", "normal_balance": "debe"},

    # --- 2. PASIVOS ---
    {"code": "2", "name": "Pasivos", "type": "pasivo", "level": 1, "is_header": True, "normal_balance": "haber"},

    {"code": "2.1", "name": "Pasivo Corriente", "type": "pasivo", "level": 2, "is_header": True, "parent": "2", "normal_balance": "haber"},
    {"code": "2.1.1", "name": "Cuentas por Pagar Proveedores", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},
    {"code": "2.1.2", "name": "Planilla por Pagar (CSS/SE/ISR)", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},
    {"code": "2.1.3", "name": "Prestamos Bancarios Corto Plazo", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},
    {"code": "2.1.4", "name": "ITBMS por Pagar", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},
    {"code": "2.1.5", "name": "XIII Mes por Pagar", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},
    {"code": "2.1.6", "name": "Vacaciones por Pagar", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},
    {"code": "2.1.7", "name": "ISR por Pagar", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},
    {"code": "2.1.8", "name": "Anticipos de Clientes", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},
    {"code": "2.1.9", "name": "Otras Cuentas por Pagar", "type": "pasivo", "level": 3, "parent": "2.1", "normal_balance": "haber"},

    {"code": "2.2", "name": "Pasivo No Corriente", "type": "pasivo", "level": 2, "is_header": True, "parent": "2", "normal_balance": "haber"},
    {"code": "2.2.1", "name": "Prestamos Bancarios Largo Plazo", "type": "pasivo", "level": 3, "parent": "2.2", "normal_balance": "haber"},

    # --- 3. PATRIMONIO ---
    {"code": "3", "name": "Patrimonio", "type": "patrimonio", "level": 1, "is_header": True, "normal_balance": "haber"},
    {"code": "3.1", "name": "Capital Social", "type": "patrimonio", "level": 2, "parent": "3", "normal_balance": "haber"},
    {"code": "3.2", "name": "Utilidades Retenidas", "type": "patrimonio", "level": 2, "parent": "3", "normal_balance": "haber"},
    {"code": "3.3", "name": "Utilidad del Periodo", "type": "patrimonio", "level": 2, "parent": "3", "normal_balance": "haber"},
    {"code": "3.4", "name": "Reserva Legal", "type": "patrimonio", "level": 2, "parent": "3", "normal_balance": "haber"},

    # --- 4. INGRESOS ---
    {"code": "4", "name": "Ingresos", "type": "ingreso", "level": 1, "is_header": True, "normal_balance": "haber"},
    {"code": "4.1", "name": "Ingresos Operativos", "type": "ingreso", "level": 2, "is_header": True, "parent": "4", "normal_balance": "haber"},
    {"code": "4.1.1", "name": "Ventas de Bienes", "type": "ingreso", "level": 3, "parent": "4.1", "normal_balance": "haber"},
    {"code": "4.1.2", "name": "Ingresos por Servicios", "type": "ingreso", "level": 3, "parent": "4.1", "normal_balance": "haber"},
    {"code": "4.1.3", "name": "Devoluciones y Descuentos", "type": "ingreso", "level": 3, "parent": "4.1", "normal_balance": "debe"},
    {"code": "4.2", "name": "Otros Ingresos", "type": "ingreso", "level": 2, "is_header": True, "parent": "4", "normal_balance": "haber"},
    {"code": "4.2.1", "name": "Ingresos Financieros (Intereses)", "type": "ingreso", "level": 3, "parent": "4.2", "normal_balance": "haber"},
    {"code": "4.2.2", "name": "Otros Ingresos No Operativos", "type": "ingreso", "level": 3, "parent": "4.2", "normal_balance": "haber"},
    {"code": "4.2.3", "name": "Ganancia en Venta de Activos", "type": "ingreso", "level": 3, "parent": "4.2", "normal_balance": "haber"},

    # --- 5. COSTOS Y GASTOS ---
    {"code": "5", "name": "Costos y Gastos", "type": "costo_gasto", "level": 1, "is_header": True, "normal_balance": "debe"},

    {"code": "5.1", "name": "Costo de Ventas", "type": "costo_gasto", "level": 2, "is_header": True, "parent": "5", "normal_balance": "debe"},
    {"code": "5.1.1", "name": "Costo de Mercancia Vendida", "type": "costo_gasto", "level": 3, "parent": "5.1", "normal_balance": "debe"},
    {"code": "5.1.2", "name": "Costo de Servicios Prestados", "type": "costo_gasto", "level": 3, "parent": "5.1", "normal_balance": "debe"},
    {"code": "5.1.3", "name": "Flete y Acarreo de Mercancia", "type": "costo_gasto", "level": 3, "parent": "5.1", "normal_balance": "debe"},

    {"code": "5.2", "name": "Gastos Operativos (OPEX)", "type": "costo_gasto", "level": 2, "is_header": True, "parent": "5", "normal_balance": "debe"},
    {"code": "5.2.1", "name": "Alquiler y Mantenimiento", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.2", "name": "Salarios y Planilla", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.3", "name": "Servicios Publicos (Luz, Agua, Internet)", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.4", "name": "Seguros", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.5", "name": "Marketing y Publicidad", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.6", "name": "Suministros de Oficina", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.7", "name": "Honorarios Profesionales", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.8", "name": "Transporte y Combustible", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.9", "name": "Otros Gastos Operativos", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.10", "name": "Capacitacion y Entrenamiento", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.11", "name": "Gastos de Representacion", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.12", "name": "Limpieza y Aseo", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.13", "name": "Suscripciones y Membresias", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.14", "name": "Reparaciones y Mantenimiento Equipo", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.15", "name": "Donaciones", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.16", "name": "Gastos de Viaje", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},
    {"code": "5.2.17", "name": "Gastos Legales y Notariales", "type": "costo_gasto", "level": 3, "parent": "5.2", "normal_balance": "debe"},

    {"code": "5.3", "name": "Gastos Financieros", "type": "costo_gasto", "level": 2, "is_header": True, "parent": "5", "normal_balance": "debe"},
    {"code": "5.3.1", "name": "Intereses Bancarios", "type": "costo_gasto", "level": 3, "parent": "5.3", "normal_balance": "debe"},
    {"code": "5.3.2", "name": "Comisiones Bancarias", "type": "costo_gasto", "level": 3, "parent": "5.3", "normal_balance": "debe"},

    {"code": "5.4", "name": "Depreciacion y Amortizacion", "type": "costo_gasto", "level": 2, "is_header": True, "parent": "5", "normal_balance": "debe"},
    {"code": "5.4.1", "name": "Gasto de Depreciacion", "type": "costo_gasto", "level": 3, "parent": "5.4", "normal_balance": "debe"},
    {"code": "5.4.2", "name": "Amortizacion de Intangibles", "type": "costo_gasto", "level": 3, "parent": "5.4", "normal_balance": "debe"},

    {"code": "5.5", "name": "Impuestos", "type": "costo_gasto", "level": 2, "is_header": True, "parent": "5", "normal_balance": "debe"},
    {"code": "5.5.1", "name": "ISR del Periodo", "type": "costo_gasto", "level": 3, "parent": "5.5", "normal_balance": "debe"},
    {"code": "5.5.2", "name": "Tasa Unica Municipal", "type": "costo_gasto", "level": 3, "parent": "5.5", "normal_balance": "debe"},
    {"code": "5.5.3", "name": "Aviso de Operacion", "type": "costo_gasto", "level": 3, "parent": "5.5", "normal_balance": "debe"},
]


# ==============================================================
# MAPEO: Concepto NLP → Cuentas DEBE/HABER
# ==============================================================
# Cada concepto mapea a una lista de lineas contables.
# El primer elemento es DEBE, el segundo HABER.
# El engine reemplaza {amount} con el monto del asiento.
# ==============================================================

CONCEPT_TO_ACCOUNTS = {
    # --- VENTAS ---
    "venta_contado": {
        "description": "Venta al contado",
        "lines": [
            {"account_code": "1.1.1", "debe": True, "description": "Cobro en efectivo/banco"},
            {"account_code": "4.1.1", "haber": True, "description": "Ingreso por venta"},
        ],
    },
    "venta_credito": {
        "description": "Venta a credito",
        "lines": [
            {"account_code": "1.1.2", "debe": True, "description": "Cuenta por cobrar"},
            {"account_code": "4.1.1", "haber": True, "description": "Ingreso por venta"},
        ],
    },
    "cobro_cliente": {
        "description": "Cobro de cliente (CxC)",
        "lines": [
            {"account_code": "1.1.1", "debe": True, "description": "Cobro recibido"},
            {"account_code": "1.1.2", "haber": True, "description": "Reduccion cuenta por cobrar"},
        ],
    },
    "ingreso_servicio": {
        "description": "Ingreso por servicio prestado",
        "lines": [
            {"account_code": "1.1.1", "debe": True, "description": "Cobro por servicio"},
            {"account_code": "4.1.2", "haber": True, "description": "Ingreso por servicios"},
        ],
    },

    # --- COMPRAS ---
    "compra_mercancia_contado": {
        "description": "Compra de mercancia al contado",
        "lines": [
            {"account_code": "5.1.1", "debe": True, "description": "Costo mercancia"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago en efectivo"},
        ],
    },
    "compra_mercancia_credito": {
        "description": "Compra de mercancia a credito",
        "lines": [
            {"account_code": "5.1.1", "debe": True, "description": "Costo mercancia"},
            {"account_code": "2.1.1", "haber": True, "description": "Cuenta por pagar proveedor"},
        ],
    },
    "pago_proveedor": {
        "description": "Pago a proveedor (CxP)",
        "lines": [
            {"account_code": "2.1.1", "debe": True, "description": "Reduccion cuenta por pagar"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },

    # --- GASTOS OPERATIVOS ---
    "alquiler": {
        "description": "Pago de alquiler",
        "lines": [
            {"account_code": "5.2.1", "debe": True, "description": "Gasto de alquiler"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "planilla": {
        "description": "Pago de planilla",
        "lines": [
            {"account_code": "5.2.2", "debe": True, "description": "Gasto de salarios"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "servicios_publicos": {
        "description": "Pago de servicios (luz, agua, internet)",
        "lines": [
            {"account_code": "5.2.3", "debe": True, "description": "Gasto servicios publicos"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "marketing": {
        "description": "Gasto de marketing/publicidad",
        "lines": [
            {"account_code": "5.2.5", "debe": True, "description": "Gasto marketing"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "honorarios": {
        "description": "Pago de honorarios profesionales",
        "lines": [
            {"account_code": "5.2.7", "debe": True, "description": "Honorarios profesionales"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },

    # --- FINANCIEROS ---
    "prestamo_recibido": {
        "description": "Prestamo bancario recibido",
        "lines": [
            {"account_code": "1.1.1", "debe": True, "description": "Deposito prestamo"},
            {"account_code": "2.1.3", "haber": True, "description": "Obligacion bancaria"},
        ],
    },
    "pago_prestamo": {
        "description": "Pago de cuota de prestamo",
        "lines": [
            {"account_code": "2.1.3", "debe": True, "description": "Abono a capital"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "pago_intereses": {
        "description": "Pago de intereses bancarios",
        "lines": [
            {"account_code": "5.3.1", "debe": True, "description": "Gasto intereses"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },

    # --- IMPUESTOS ---
    "pago_itbms": {
        "description": "Pago de ITBMS a la DGI",
        "lines": [
            {"account_code": "2.1.4", "debe": True, "description": "ITBMS pagado"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "pago_isr": {
        "description": "Pago de ISR",
        "lines": [
            {"account_code": "5.5.1", "debe": True, "description": "ISR del periodo"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "pago_css": {
        "description": "Pago de planilla CSS",
        "lines": [
            {"account_code": "2.1.2", "debe": True, "description": "Planilla CSS pagada"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },

    # --- GASTOS ADICIONALES (categorias NLP comunes) ---
    "combustible": {
        "description": "Pago de combustible/gasolina",
        "lines": [
            {"account_code": "5.2.8", "debe": True, "description": "Gasto combustible"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "viaticos": {
        "description": "Pago de viaticos",
        "lines": [
            {"account_code": "5.2.9", "debe": True, "description": "Gasto viaticos"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "suministros": {
        "description": "Compra de suministros de oficina",
        "lines": [
            {"account_code": "5.2.6", "debe": True, "description": "Suministros oficina"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "seguros": {
        "description": "Pago de seguro",
        "lines": [
            {"account_code": "5.2.4", "debe": True, "description": "Gasto de seguro"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "mantenimiento": {
        "description": "Pago de mantenimiento",
        "lines": [
            {"account_code": "5.2.1", "debe": True, "description": "Gasto mantenimiento"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "comida_clientes": {
        "description": "Almuerzo/comida con clientes",
        "lines": [
            {"account_code": "5.2.11", "debe": True, "description": "Gasto representacion"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "gasto_general": {
        "description": "Gasto general",
        "lines": [
            {"account_code": "5.2.9", "debe": True, "description": "Otros gastos"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },

    # --- DEPRECIACION ---
    "depreciacion": {
        "description": "Registro de depreciacion mensual",
        "lines": [
            {"account_code": "5.4.1", "debe": True, "description": "Gasto depreciacion"},
            {"account_code": "1.2.4", "haber": True, "description": "Depreciacion acumulada"},
        ],
    },

    # --- PATRIMONIO ---
    "aporte_capital": {
        "description": "Aporte de capital del socio",
        "lines": [
            {"account_code": "1.1.1", "debe": True, "description": "Deposito del socio"},
            {"account_code": "3.1", "haber": True, "description": "Aumento de capital"},
        ],
    },
    "retiro_utilidades": {
        "description": "Retiro de utilidades",
        "lines": [
            {"account_code": "3.2", "debe": True, "description": "Distribucion utilidades"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago al socio"},
        ],
    },

    # --- CATEGORIAS PYME ADICIONALES ---
    "capacitacion": {
        "description": "Pago de capacitacion/entrenamiento",
        "lines": [
            {"account_code": "5.2.10", "debe": True, "description": "Gasto capacitacion"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "representacion": {
        "description": "Gastos de representacion",
        "lines": [
            {"account_code": "5.2.11", "debe": True, "description": "Gasto representacion"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "limpieza": {
        "description": "Pago de limpieza/aseo",
        "lines": [
            {"account_code": "5.2.12", "debe": True, "description": "Gasto limpieza"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "suscripciones": {
        "description": "Pago de suscripciones/membresias",
        "lines": [
            {"account_code": "5.2.13", "debe": True, "description": "Suscripciones y membresias"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "reparaciones": {
        "description": "Reparacion de equipo",
        "lines": [
            {"account_code": "5.2.14", "debe": True, "description": "Reparaciones equipo"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "donaciones": {
        "description": "Donacion",
        "lines": [
            {"account_code": "5.2.15", "debe": True, "description": "Gasto donacion"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "viajes": {
        "description": "Gastos de viaje",
        "lines": [
            {"account_code": "5.2.16", "debe": True, "description": "Gasto de viaje"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "gastos_legales": {
        "description": "Gastos legales/notariales",
        "lines": [
            {"account_code": "5.2.17", "debe": True, "description": "Gastos legales"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "flete": {
        "description": "Flete de mercancia",
        "lines": [
            {"account_code": "5.1.3", "debe": True, "description": "Flete y acarreo"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "aviso_operacion": {
        "description": "Pago de Aviso de Operacion",
        "lines": [
            {"account_code": "5.5.3", "debe": True, "description": "Aviso de Operacion"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "comisiones_bancarias": {
        "description": "Pago de comisiones bancarias",
        "lines": [
            {"account_code": "5.3.2", "debe": True, "description": "Comisiones bancarias"},
            {"account_code": "1.1.1", "haber": True, "description": "Pago desde banco"},
        ],
    },
    "amortizacion": {
        "description": "Amortizacion de intangibles",
        "lines": [
            {"account_code": "5.4.2", "debe": True, "description": "Amortizacion intangibles"},
            {"account_code": "1.2.6", "haber": True, "description": "Activos intangibles"},
        ],
    },
}


# ==============================================================
# MAPEO: Tipo de cuenta → campo en financial_records
# ==============================================================
# Usado por aggregate_to_financial_record()
# ==============================================================

ACCOUNT_TYPE_TO_FINANCIAL_FIELD = {
    # Ingresos → revenue
    "4.1.1": "revenue",
    "4.1.2": "revenue",
    "4.1.3": "revenue",  # Devoluciones (negativo)

    # Costo de ventas → cogs
    "5.1.1": "cogs",
    "5.1.2": "cogs",
    "5.1.3": "cogs",           # Flete y Acarreo

    # OPEX desglosado
    "5.2.1": "opex_rent",
    "5.2.2": "opex_payroll",
    "5.2.3": "opex_other",
    "5.2.4": "opex_other",
    "5.2.5": "opex_other",
    "5.2.6": "opex_other",
    "5.2.7": "opex_other",
    "5.2.8": "opex_other",
    "5.2.9": "opex_other",
    "5.2.10": "opex_other",    # Capacitacion
    "5.2.11": "opex_other",    # Representacion
    "5.2.12": "opex_other",    # Limpieza
    "5.2.13": "opex_other",    # Suscripciones
    "5.2.14": "opex_other",    # Reparaciones
    "5.2.15": "opex_other",    # Donaciones
    "5.2.16": "opex_other",    # Viajes
    "5.2.17": "opex_other",    # Gastos Legales

    # Financieros y depreciacion
    "5.3.1": "interest_expense",
    "5.3.2": "interest_expense",
    "5.4.1": "depreciation",
    "5.4.2": "depreciation",   # Amortizacion

    # Impuestos
    "5.5.1": "tax_expense",
    "5.5.2": "tax_expense",
    "5.5.3": "tax_expense",    # Aviso de Operacion

    # Balance
    "1.1.1": "cash_balance",
    "1.1.2": "accounts_receivable",
    "1.1.3": "inventory",
    "2.1.1": "accounts_payable",
    "2.1.3": "bank_debt",
    "2.2.1": "bank_debt",
}
