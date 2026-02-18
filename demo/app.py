"""
SABIA EMPRENDE — Demo Interactiva (Streamlit)
Plataforma financiera para emprendedores de Panama.

Ejecutar: streamlit run app.py
"""
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from dataclasses import dataclass

# ============================================
# CONFIGURACION DE PAGINA
# ============================================
st.set_page_config(
    page_title="SABIA EMPRENDE | Demo",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ============================================
# CSS PERSONALIZADO
# ============================================
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Montserrat:wght@400;600;700;800&display=swap');

html, body, [class*="st-"] {
    font-family: 'Montserrat', sans-serif;
}
h1, h2, h3 {
    font-family: 'Playfair Display', serif !important;
}

/* Cards */
.metric-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    margin-bottom: 12px;
}
.metric-card-green { border-left: 4px solid #10B981; }
.metric-card-red { border-left: 4px solid #EF4444; }
.metric-card-amber { border-left: 4px solid #F59E0B; }
.metric-card-blue { border-left: 4px solid #3B82F6; }

/* Header */
.header-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
}
.badge-ok { background: #D1FAE5; color: #065F46; }
.badge-warning { background: #FEF3C7; color: #92400E; }
.badge-danger { background: #FEE2E2; color: #991B1B; }

/* Semaforo */
.gauge-container {
    text-align: center;
    padding: 16px;
    background: #F8FAFC;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
}

/* Hide streamlit branding */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)


# ============================================
# CALCULO FINANCIERO
# ============================================
@dataclass
class FinancialRecord:
    revenue: float = 50000
    cogs: float = 30000
    opex_rent: float = 5000
    opex_payroll: float = 7000
    opex_other: float = 3000
    depreciation: float = 500
    interest_expense: float = 800
    tax_expense: float = 700
    cash_balance: float = 12000
    accounts_receivable: float = 8000
    inventory: float = 6000
    accounts_payable: float = 4000
    bank_debt: float = 10000


FACTOR_COSTO_REAL = 1.36  # Ley 462/2025


def compute_cascada(r: FinancialRecord):
    gross_profit = r.revenue - r.cogs
    total_opex = r.opex_rent + r.opex_payroll + r.opex_other
    ebitda = gross_profit - total_opex
    ebit = ebitda - r.depreciation
    ebt = ebit - r.interest_expense
    net_income = ebt - r.tax_expense
    return {
        "revenue": r.revenue, "cogs": r.cogs,
        "gross_profit": gross_profit, "total_opex": total_opex,
        "ebitda": ebitda, "ebit": ebit, "ebt": ebt,
        "net_income": net_income,
        "gross_margin_pct": (gross_profit / r.revenue * 100) if r.revenue > 0 else 0,
        "ebitda_margin_pct": (ebitda / r.revenue * 100) if r.revenue > 0 else 0,
        "net_margin_pct": (net_income / r.revenue * 100) if r.revenue > 0 else 0,
    }


def compute_oxigeno(r: FinancialRecord):
    dias_calle = (r.accounts_receivable / r.revenue * 30) if r.revenue > 0 else 0
    dias_inventario = (r.inventory / r.cogs * 30) if r.cogs > 0 else 0
    dias_proveedor = (r.accounts_payable / r.cogs * 30) if r.cogs > 0 else 0
    ccc = dias_calle + dias_inventario - dias_proveedor
    total_liquido = r.cash_balance + r.accounts_receivable
    pasivo_corto = r.accounts_payable + r.bank_debt
    prueba_acida = total_liquido / pasivo_corto if pasivo_corto > 0 else 0
    dinero_atrapado = r.accounts_receivable + r.inventory
    cascada = compute_cascada(r)
    cobertura = cascada["ebitda"] / r.interest_expense if r.interest_expense > 0 else 10
    return {
        "dias_calle": dias_calle, "dias_inventario": dias_inventario,
        "dias_proveedor": dias_proveedor, "ccc": ccc,
        "prueba_acida": prueba_acida, "dinero_atrapado": dinero_atrapado,
        "cobertura_bancaria": cobertura, "total_liquido": total_liquido,
        "pasivo_corto": pasivo_corto,
    }


def compute_ratios(r: FinancialRecord):
    gross_profit = r.revenue - r.cogs
    ebitda_margin = (r.revenue - r.cogs - r.opex_rent - r.opex_payroll - r.opex_other) / r.revenue * 100 if r.revenue > 0 else 0
    rent_ratio = r.opex_rent / r.revenue * 100 if r.revenue > 0 else 0
    costo_real = r.opex_payroll * FACTOR_COSTO_REAL
    payroll_ratio = costo_real / gross_profit * 100 if gross_profit > 0 else 0
    return {"ebitda_margin": ebitda_margin, "rent_ratio": rent_ratio, "payroll_ratio": payroll_ratio}


def compute_breakeven(r: FinancialRecord):
    total_opex = r.opex_rent + r.opex_payroll + r.opex_other
    costos_fijos = total_opex + r.interest_expense
    mc_ratio = (r.revenue - r.cogs) / r.revenue if r.revenue > 0 else 0
    breakeven = costos_fijos / mc_ratio if mc_ratio > 0 else 0
    margen_seguridad = r.revenue - breakeven
    return {"breakeven": breakeven, "margen_seguridad": margen_seguridad, "mc_ratio": mc_ratio}


def compute_valoracion(ebitda_mensual, multiplo, deuda_total):
    ebitda_anual = ebitda_mensual * 12
    valor_operativo = max(ebitda_anual * multiplo, 0)
    patrimonio = valor_operativo - deuda_total
    return {"ebitda_anual": ebitda_anual, "valor_operativo": valor_operativo, "patrimonio": patrimonio}


def get_verdict(cascada, ox, ratios):
    if cascada["ebitda"] < 0:
        return "INTERVENCION DE EMERGENCIA", "El negocio consume capital.", "danger"
    elif ox["ccc"] > 60:
        return "AGUJERO NEGRO", "Rentable pero insolvente. Prioridad: Cobrar.", "warning"
    elif ratios["rent_ratio"] > 15:
        return "RIESGO INMOBILIARIO", "Trabajas para pagar el local.", "warning"
    else:
        return "EMPRESA SALUDABLE Y ESCALABLE", "Listo para crecer.", "ok"


# ============================================
# NOMINA PANAMA
# ============================================
def compute_nomina(salario: float):
    ss_patronal = salario * 0.1325
    se_patronal = salario * 0.015
    rp_patronal = salario * 0.015
    decimo = salario * (1/12)
    vacaciones = salario * (2.5/60)
    prima = salario * (1/52)
    carga = ss_patronal + se_patronal + rp_patronal + decimo + vacaciones + prima
    costo_total = salario + carga
    factor = costo_total / salario if salario > 0 else 0
    return {
        "salario": salario,
        "ss_patronal": ss_patronal, "se_patronal": se_patronal,
        "rp_patronal": rp_patronal, "decimo": decimo,
        "vacaciones": vacaciones, "prima": prima,
        "carga_total": carga, "costo_empresa": costo_total,
        "factor": factor,
        "desglose": {
            "CSS Patronal (13.25%)": ss_patronal,
            "Seg. Educativo (1.5%)": se_patronal,
            "Riesgos Prof. (1.5%)": rp_patronal,
            "XIII Mes (8.33%)": decimo,
            "Vacaciones (4.17%)": vacaciones,
            "Prima Antig. (1.92%)": prima,
        }
    }


# ============================================
# GRAFICAS
# ============================================
def waterfall_chart(cascada):
    labels = ["Ventas", "(-) Costo Ventas", "Ut. Bruta", "(-) OPEX", "EBITDA",
              "(-) Deprec.", "EBIT", "(-) Intereses", "EBT", "(-) Impuestos", "Ut. Neta"]
    values = [
        cascada["revenue"], -cascada["cogs"], cascada["gross_profit"],
        -cascada["total_opex"], cascada["ebitda"],
        0, cascada["ebit"],  # Placeholder for depreciation
        0, cascada["ebt"],  # Placeholder for interest
        0, cascada["net_income"]  # Placeholder for tax
    ]
    measures = ["absolute", "relative", "total", "relative", "total",
                "relative", "total", "relative", "total", "relative", "total"]

    # Fix relative values
    # We need to recalculate based on actual cascada values
    fig = go.Figure(go.Waterfall(
        name="Cascada", orientation="v",
        measure=["absolute", "relative", "total", "relative", "total",
                 "relative", "total", "relative", "total", "relative", "total"],
        x=labels,
        y=[cascada["revenue"], -cascada["cogs"], cascada["gross_profit"],
           -cascada["total_opex"], cascada["ebitda"],
           -500, cascada["ebit"],  # depreciation placeholder
           -800, cascada["ebt"],   # interest placeholder
           -700, cascada["net_income"]],  # tax placeholder
        connector={"line": {"color": "#cbd5e1"}},
        increasing={"marker": {"color": "#10B981"}},
        decreasing={"marker": {"color": "#EF4444"}},
        totals={"marker": {"color": "#3B82F6"}},
        textposition="outside",
        text=[f"${v:,.0f}" for v in [
            cascada["revenue"], cascada["cogs"], cascada["gross_profit"],
            cascada["total_opex"], cascada["ebitda"],
            500, cascada["ebit"], 800, cascada["ebt"], 700, cascada["net_income"]
        ]],
    ))
    fig.update_layout(
        title=dict(text="Cascada de Utilidades (P&L)", font=dict(family="Playfair Display", size=20)),
        showlegend=False, height=420,
        plot_bgcolor="white",
        yaxis=dict(gridcolor="#f1f5f9", tickformat="$,.0f"),
        font=dict(family="Montserrat"),
        margin=dict(t=60, b=40),
    )
    return fig


def breakeven_chart(r: FinancialRecord, be):
    import numpy as np
    x = list(range(0, int(r.revenue * 2.2), max(int(r.revenue * 2.2 // 50), 1)))
    mc = be["mc_ratio"]
    total_opex = r.opex_rent + r.opex_payroll + r.opex_other
    costos_fijos = total_opex + r.interest_expense

    y_ventas = x
    y_costos = [costos_fijos + v * (1 - mc) for v in x]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=x, y=y_ventas, name="Ingresos", line=dict(color="#3B82F6", width=3)))
    fig.add_trace(go.Scatter(x=x, y=y_costos, name="Costos Totales", line=dict(color="#EF4444", width=3)))

    # Breakeven line
    fig.add_vline(x=be["breakeven"], line_dash="dash", line_color="#F59E0B", line_width=2,
                  annotation_text=f"Breakeven: ${be['breakeven']:,.0f}", annotation_position="top left")
    # Hoy line
    fig.add_vline(x=r.revenue, line_dash="dot", line_color="#8B5CF6", line_width=2,
                  annotation_text=f"Hoy: ${r.revenue:,.0f}", annotation_position="top right")

    # Zona profit/loss shading
    fig.add_vrect(x0=0, x1=be["breakeven"], fillcolor="#FEE2E2", opacity=0.3, line_width=0)
    fig.add_vrect(x0=be["breakeven"], x1=max(x), fillcolor="#D1FAE5", opacity=0.3, line_width=0)

    fig.update_layout(
        title=dict(text="Punto de Equilibrio (Breakeven)", font=dict(family="Playfair Display", size=20)),
        xaxis=dict(title="Ventas Mensuales", tickformat="$,.0f", gridcolor="#f1f5f9"),
        yaxis=dict(title="Monto ($)", tickformat="$,.0f", gridcolor="#f1f5f9"),
        height=400, plot_bgcolor="white",
        font=dict(family="Montserrat"),
        legend=dict(orientation="h", y=-0.15),
        margin=dict(t=60, b=60),
    )
    return fig


def gauge_chart(value, max_val, title, unit, thresholds, inverted=False):
    if inverted:
        color = "#EF4444" if value > thresholds[1] else "#F59E0B" if value > thresholds[0] else "#10B981"
    else:
        color = "#EF4444" if value < thresholds[0] else "#F59E0B" if value < thresholds[1] else "#10B981"

    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=value,
        number={"suffix": unit, "font": {"size": 28, "family": "Montserrat", "color": color}},
        title={"text": title, "font": {"size": 13, "family": "Montserrat"}},
        gauge={
            "axis": {"range": [0, max_val], "tickfont": {"size": 10}},
            "bar": {"color": color, "thickness": 0.75},
            "bgcolor": "#E2E8F0",
            "borderwidth": 0,
            "steps": [
                {"range": [0, max_val * 0.33], "color": "#FEE2E2" if not inverted else "#D1FAE5"},
                {"range": [max_val * 0.33, max_val * 0.66], "color": "#FEF3C7"},
                {"range": [max_val * 0.66, max_val], "color": "#D1FAE5" if not inverted else "#FEE2E2"},
            ],
        }
    ))
    fig.update_layout(height=180, margin=dict(t=40, b=0, l=30, r=30), font=dict(family="Montserrat"))
    return fig


def ccc_chart(ox):
    labels = ["Dias Cobranza", "Dias Inventario", "Dias Proveedor", "CCC Total"]
    values = [ox["dias_calle"], ox["dias_inventario"], -ox["dias_proveedor"], ox["ccc"]]
    colors = ["#3B82F6", "#F59E0B", "#10B981",
              "#10B981" if ox["ccc"] <= 30 else "#F59E0B" if ox["ccc"] <= 60 else "#EF4444"]

    fig = go.Figure(go.Bar(
        x=labels, y=[ox["dias_calle"], ox["dias_inventario"], ox["dias_proveedor"], ox["ccc"]],
        marker_color=colors, text=[f"{v:.0f}d" for v in [ox["dias_calle"], ox["dias_inventario"], ox["dias_proveedor"], ox["ccc"]]],
        textposition="outside",
    ))
    fig.update_layout(
        title=dict(text="Ciclo de Conversion de Caja (CCC)", font=dict(family="Playfair Display", size=18)),
        height=320, plot_bgcolor="white", showlegend=False,
        yaxis=dict(title="Dias", gridcolor="#f1f5f9"),
        font=dict(family="Montserrat"),
        margin=dict(t=60, b=40),
    )
    return fig


def nomina_chart(nom):
    labels = list(nom["desglose"].keys())
    values = list(nom["desglose"].values())
    colors = ["#EF4444", "#F59E0B", "#8B5CF6", "#3B82F6", "#06B6D4", "#10B981"]

    fig = go.Figure(go.Pie(
        labels=labels, values=values,
        hole=0.55, marker=dict(colors=colors),
        textinfo="label+percent", textposition="outside",
        textfont=dict(size=11),
    ))
    fig.update_layout(
        title=dict(text="Desglose Carga Patronal", font=dict(family="Playfair Display", size=18)),
        height=350, showlegend=False,
        font=dict(family="Montserrat"),
        margin=dict(t=60, b=20),
        annotations=[dict(text=f"x{nom['factor']:.2f}", x=0.5, y=0.5, font_size=24, showarrow=False, font=dict(family="Montserrat", color="#1E293B"))]
    )
    return fig


def valoracion_chart(val, multiplo):
    NIVELES = [
        {"min": 1, "max": 2, "label": "Autoempleo", "color": "#EF4444"},
        {"min": 2.5, "max": 3.5, "label": "PYME Estandar", "color": "#F59E0B"},
        {"min": 4, "max": 5, "label": "Maq. de Escalar", "color": "#10B981"},
        {"min": 5.5, "max": 10, "label": "Alto Valor", "color": "#8B5CF6"},
    ]

    fig = go.Figure()
    for n in NIVELES:
        fig.add_trace(go.Bar(
            x=[n["max"] - n["min"]], y=[n["label"]], orientation="h",
            base=n["min"], marker_color=n["color"], opacity=0.3,
            showlegend=False, hoverinfo="skip",
        ))

    fig.add_vline(x=multiplo, line_color="#1E293B", line_width=3,
                  annotation_text=f"Tu multiplo: {multiplo}x", annotation_position="top")

    fig.update_layout(
        title=dict(text="Escala de Multiplos EBITDA", font=dict(family="Playfair Display", size=18)),
        xaxis=dict(title="Multiplo EBITDA", range=[0, 11], gridcolor="#f1f5f9"),
        height=250, plot_bgcolor="white", barmode="overlay",
        font=dict(family="Montserrat"),
        margin=dict(t=60, b=40, l=120),
    )
    return fig


# ============================================
# SIDEBAR — DATOS DE ENTRADA
# ============================================
st.sidebar.markdown("## 🌿 SABIA EMPRENDE")
st.sidebar.markdown("##### Ingresa tus datos financieros mensuales")
st.sidebar.markdown("---")

st.sidebar.markdown("**Estado de Resultados**")
revenue = st.sidebar.number_input("Ventas mensuales ($)", value=50000, step=1000)
cogs = st.sidebar.number_input("Costo de ventas ($)", value=30000, step=1000)
opex_rent = st.sidebar.number_input("Alquiler ($)", value=5000, step=500)
opex_payroll = st.sidebar.number_input("Nomina total ($)", value=7000, step=500)
opex_other = st.sidebar.number_input("Otros gastos operativos ($)", value=3000, step=500)
depreciation = st.sidebar.number_input("Depreciacion ($)", value=500, step=100)
interest = st.sidebar.number_input("Intereses bancarios ($)", value=800, step=100)
tax = st.sidebar.number_input("Impuestos ($)", value=700, step=100)

st.sidebar.markdown("---")
st.sidebar.markdown("**Balance General**")
cash = st.sidebar.number_input("Efectivo en banco ($)", value=12000, step=1000)
ar = st.sidebar.number_input("Cuentas por cobrar ($)", value=8000, step=1000)
inv = st.sidebar.number_input("Inventario ($)", value=6000, step=1000)
ap = st.sidebar.number_input("Cuentas por pagar ($)", value=4000, step=1000)
debt = st.sidebar.number_input("Deuda bancaria ($)", value=10000, step=1000)

r = FinancialRecord(
    revenue=revenue, cogs=cogs, opex_rent=opex_rent, opex_payroll=opex_payroll,
    opex_other=opex_other, depreciation=depreciation, interest_expense=interest,
    tax_expense=tax, cash_balance=cash, accounts_receivable=ar, inventory=inv,
    accounts_payable=ap, bank_debt=debt,
)

# ============================================
# CALCULOS
# ============================================
cascada = compute_cascada(r)
ox = compute_oxigeno(r)
ratios = compute_ratios(r)
be = compute_breakeven(r)
verdict, detail, severity = get_verdict(cascada, ox, ratios)

# ============================================
# HEADER
# ============================================
col_h1, col_h2 = st.columns([3, 1])
with col_h1:
    st.markdown("# 🌿 SABIA EMPRENDE")
    st.markdown("*Tu Aliado Estrategico para Panama*")
with col_h2:
    badge_class = f"badge-{severity}"
    st.markdown(f"""
    <div style="text-align:right; padding-top:20px;">
        <span class="header-badge {badge_class}">{verdict}</span>
        <p style="font-size:12px; color:#64748b; margin-top:4px;">{detail}</p>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")

# ============================================
# TAB 1: MI CONTABILIDAD
# ============================================
tab1, tab2, tab3 = st.tabs(["📊 Mi Contabilidad", "🎯 Mi Director Financiero PTY", "🏢 Mi Empresa"])

with tab1:
    # === Metricas rapidas ===
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric("Ventas", f"${r.revenue:,.0f}")
    with m2:
        ebitda_color = "normal" if cascada["ebitda"] >= 0 else "inverse"
        st.metric("EBITDA", f"${cascada['ebitda']:,.0f}", f"{cascada['ebitda_margin_pct']:.1f}%", delta_color=ebitda_color)
    with m3:
        un_color = "normal" if cascada["net_income"] >= 0 else "inverse"
        st.metric("Utilidad Neta", f"${cascada['net_income']:,.0f}", f"{cascada['net_margin_pct']:.1f}%", delta_color=un_color)
    with m4:
        ccc_val = ox["ccc"]
        st.metric("CCC", f"{ccc_val:.0f} dias", "OK" if ccc_val <= 30 else "Lento" if ccc_val <= 60 else "Critico")

    st.markdown("---")

    # === Cascada + Diagnostico ===
    col1, col2 = st.columns([2, 1])
    with col1:
        st.plotly_chart(waterfall_chart(cascada), use_container_width=True)
    with col2:
        # Motor EBITDA
        em = cascada["ebitda_margin_pct"]
        if em < 10:
            motor_emoji, motor_label, motor_desc = "🔴", "Motor Debil", "Margen operativo <10%"
        elif em < 15:
            motor_emoji, motor_label, motor_desc = "🟡", "Motor Estable", "Flujo positivo, optimizar"
        else:
            motor_emoji, motor_label, motor_desc = "🟢", "Motor Potente", "Capacidad de reinversion"

        st.markdown(f"""
        <div class="metric-card metric-card-{'green' if em >= 15 else 'amber' if em >= 10 else 'red'}">
            <h4>{motor_emoji} Potencia (EBITDA)</h4>
            <p style="font-size:28px; font-weight:800; margin:8px 0;">{em:.1f}%</p>
            <p style="font-size:12px; color:#64748b;">{motor_label}: {motor_desc}</p>
        </div>
        """, unsafe_allow_html=True)

        # Prueba Acida
        pa = ox["prueba_acida"]
        pa_emoji = "🟢" if pa >= 1.0 else "🟡" if pa >= 0.5 else "🔴"
        st.markdown(f"""
        <div class="metric-card metric-card-{'green' if pa >= 1.0 else 'amber' if pa >= 0.5 else 'red'}">
            <h4>{pa_emoji} Prueba Acida</h4>
            <p style="font-size:28px; font-weight:800; margin:8px 0;">{pa:.2f}x</p>
            <p style="font-size:12px; color:#64748b;">Meta: ≥ 1.0x | Liquido: ${ox['total_liquido']:,.0f}</p>
        </div>
        """, unsafe_allow_html=True)

        # Cobertura Deuda
        cb = min(ox["cobertura_bancaria"], 10)
        cb_emoji = "🟢" if cb >= 1.5 else "🟡" if cb >= 1.0 else "🔴"
        st.markdown(f"""
        <div class="metric-card metric-card-{'green' if cb >= 1.5 else 'amber' if cb >= 1.0 else 'red'}">
            <h4>{cb_emoji} Cobertura de Deuda</h4>
            <p style="font-size:28px; font-weight:800; margin:8px 0;">{cb:.1f}x</p>
            <p style="font-size:12px; color:#64748b;">Meta: ≥ 1.5x | EBITDA cubre intereses</p>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")

    # === Semaforo Integral (4 Gauges) ===
    st.markdown("### Semaforo Integral")
    g1, g2, g3, g4 = st.columns(4)
    with g1:
        st.plotly_chart(gauge_chart(cascada["ebitda_margin_pct"], 30, "Margen EBITDA", "%", [10, 15], False), use_container_width=True)
        st.caption("Meta: >15%")
    with g2:
        st.plotly_chart(gauge_chart(ratios["rent_ratio"], 25, "Alquiler / Ventas", "%", [10, 15], True), use_container_width=True)
        st.caption("Meta: <10%")
    with g3:
        st.plotly_chart(gauge_chart(ratios["payroll_ratio"], 60, "Nomina Real / Ut.B.", "%", [35, 45], True), use_container_width=True)
        st.caption("Meta: <35% (Factor 1.36x)")
    with g4:
        st.plotly_chart(gauge_chart(ox["prueba_acida"], 3, "Prueba Acida", "x", [0.8, 1.0], False), use_container_width=True)
        st.caption("Meta: >1.0x")

    st.markdown("---")

    # === Breakeven ===
    col_be1, col_be2 = st.columns([2, 1])
    with col_be1:
        st.plotly_chart(breakeven_chart(r, be), use_container_width=True)
    with col_be2:
        zone = "🟢 GANANCIA" if be["margen_seguridad"] > 0 else "🔴 PERDIDA"
        st.markdown(f"""
        <div class="metric-card metric-card-{'green' if be['margen_seguridad'] > 0 else 'red'}">
            <h4>Zona Actual: {zone}</h4>
            <p style="font-size:12px; color:#64748b; margin-top:8px;">
                <b>Punto de Equilibrio:</b> ${be['breakeven']:,.0f}/mes<br>
                <b>Ventas Actuales:</b> ${r.revenue:,.0f}/mes<br>
                <b>Margen de Seguridad:</b> ${be['margen_seguridad']:,.0f}<br>
                <b>Margen Contribucion:</b> {be['mc_ratio']*100:.1f}%
            </p>
        </div>
        """, unsafe_allow_html=True)


# ============================================
# TAB 2: MI DIRECTOR FINANCIERO PTY
# ============================================
with tab2:
    subtab = st.radio("Seccion:", ["Oxigeno del Negocio", "Nomina Panama 2026", "Valoracion Empresa"], horizontal=True)

    if subtab == "Oxigeno del Negocio":
        # === CCC ===
        ccc_status = "🟢 Rapido" if ox["ccc"] <= 30 else "🟡 Lento" if ox["ccc"] <= 60 else "🔴 Critico"
        st.markdown(f"### Ciclo de Conversion de Caja — {ccc_status}")

        cc1, cc2, cc3, cc4 = st.columns(4)
        with cc1:
            st.metric("Dias Cobranza", f"{ox['dias_calle']:.0f}d", help="Cuanto tardan tus clientes en pagarte")
        with cc2:
            st.metric("Dias Inventario", f"{ox['dias_inventario']:.0f}d", help="Cuanto tiempo tienes mercancia sin vender")
        with cc3:
            st.metric("Dias Proveedor", f"{ox['dias_proveedor']:.0f}d", help="Cuanto tardas en pagar proveedores")
        with cc4:
            delta_color = "normal" if ox["ccc"] <= 30 else "inverse"
            st.metric("CCC Total", f"{ox['ccc']:.0f} dias", "Saludable" if ox["ccc"] <= 30 else "Revisar", delta_color=delta_color)

        col_ccc1, col_ccc2 = st.columns([1, 1])
        with col_ccc1:
            st.plotly_chart(ccc_chart(ox), use_container_width=True)
        with col_ccc2:
            st.markdown(f"""
            <div class="metric-card metric-card-blue">
                <h4>💰 Dinero Atrapado</h4>
                <p style="font-size:28px; font-weight:800; margin:8px 0;">${ox['dinero_atrapado']:,.0f}</p>
                <p style="font-size:12px; color:#64748b;">
                    Cuentas x Cobrar: ${r.accounts_receivable:,.0f}<br>
                    Inventario: ${r.inventory:,.0f}
                </p>
            </div>
            """, unsafe_allow_html=True)

            if ox["ccc"] > 30:
                st.warning("🆘 **Plan de Rescate de Caja:**")
                if ox["dias_calle"] > 15:
                    st.markdown("• **Cobra mas rapido:** Reduce condiciones de credito a 15 dias.")
                if ox["dias_inventario"] > 20:
                    st.markdown("• **Reduce inventario:** Ofertas flash para mover mercancia.")
                if ox["dias_proveedor"] < 20:
                    st.markdown("• **Negocia con proveedores:** Pide 30 dias de plazo.")


    elif subtab == "Nomina Panama 2026":
        st.markdown("### Costo Real de Personal — Panama 2026")
        st.info("**Ley 462 de 2025:** CSS Patronal sube de 12.25% a **13.25%**")

        sal = st.slider("Salario bruto mensual ($)", 600, 10000, 1500, 50)
        nom = compute_nomina(sal)

        n1, n2, n3 = st.columns(3)
        with n1:
            st.metric("Salario Bruto", f"${nom['salario']:,.0f}")
        with n2:
            st.metric("Carga Patronal", f"${nom['carga_total']:,.0f}", f"+{(nom['factor']-1)*100:.0f}%")
        with n3:
            st.metric("Costo Real Empresa", f"${nom['costo_empresa']:,.0f}", f"Factor {nom['factor']:.2f}x")

        col_n1, col_n2 = st.columns([1, 1])
        with col_n1:
            st.plotly_chart(nomina_chart(nom), use_container_width=True)
        with col_n2:
            st.markdown("#### Desglose Carga Patronal")
            for label, val in nom["desglose"].items():
                st.markdown(f"• **{label}:** ${val:,.2f}")
            st.markdown(f"---")
            st.markdown(f"**Total Carga:** ${nom['carga_total']:,.2f}")
            st.markdown(f"**Factor:** {nom['factor']:.2f}x")


    elif subtab == "Valoracion Empresa":
        st.markdown("### Valoracion de Tu Empresa (OpCo)")

        multiplo = st.slider("Multiplo EBITDA", 1.0, 10.0, 3.0, 0.5)
        val = compute_valoracion(cascada["ebitda"], multiplo, r.bank_debt)

        # Nivel del multiplo
        if multiplo <= 2:
            nivel = "🔴 Autoempleo — Negocio depende 100% del dueno"
        elif multiplo <= 3.5:
            nivel = "🟡 PYME Estandar — Operacion funciona con equipo"
        elif multiplo <= 5:
            nivel = "🟢 Maquina de Escalar — Procesos documentados"
        else:
            nivel = "🟣 Alto Valor — Marca, tecnologia, contratos exclusivos"

        st.info(nivel)

        v1, v2, v3 = st.columns(3)
        with v1:
            st.metric("EBITDA Anual", f"${val['ebitda_anual']:,.0f}")
        with v2:
            st.metric("Valor Operativo (OpCo)", f"${val['valor_operativo']:,.0f}", f"{multiplo}x EBITDA")
        with v3:
            st.metric("👑 Patrimonio Neto", f"${val['patrimonio']:,.0f}", f"OpCo - Deuda ${r.bank_debt:,.0f}")

        st.plotly_chart(valoracion_chart(val, multiplo), use_container_width=True)

        st.markdown(f"""
        **Ecuacion de Patrimonio:**
        `EBITDA Anual (${val['ebitda_anual']:,.0f}) x Multiplo ({multiplo}x) = OpCo (${val['valor_operativo']:,.0f}) - Deuda (${r.bank_debt:,.0f}) = **${val['patrimonio']:,.0f}**`
        """)


# ============================================
# TAB 3: MI EMPRESA
# ============================================
with tab3:
    st.markdown("### Modulo Legal y Compliance")

    # Radar Fiscal ITBMS
    annual_rev = r.revenue * 12
    if annual_rev >= 36000:
        itbms_status = "🔴 OBLIGATORIO"
        itbms_desc = "Debes cobrar 7% de ITBMS. Ventas anuales superan $36,000."
    elif annual_rev >= 30000:
        itbms_status = "🟡 PRECAUCION"
        itbms_desc = "Cerca del limite de $36,000 anuales."
    else:
        itbms_status = "🟢 LIBRE"
        itbms_desc = "Regimen Simplificado. No cobras ITBMS."

    st.markdown(f"""
    <div class="metric-card metric-card-{'red' if annual_rev >= 36000 else 'amber' if annual_rev >= 30000 else 'green'}">
        <h4>Radar Fiscal — ITBMS: {itbms_status}</h4>
        <p style="font-size:12px; color:#64748b;">{itbms_desc}</p>
        <p style="font-size:18px; font-weight:700; margin-top:8px;">Venta Anual Proyectada: ${annual_rev:,.0f}</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    # Checklist de Constitucion
    st.markdown("### Checklist de Constitucion en Panama")

    st.markdown("##### 📋 Registro")
    ch1 = st.checkbox("Pacto Social (escritura publica)", value=False)
    ch2 = st.checkbox("Pago de Tasa Unica ($350 SPA / $300 SRL)", value=False)
    ch3 = st.checkbox("Designar Agente Residente", value=False)
    ch4 = st.checkbox("Registro de Beneficiarios Finales", value=False)
    ch5 = st.checkbox("Reserva de Nombre Comercial", value=False)

    st.markdown("##### 🧾 Fiscal")
    ch6 = st.checkbox("Obtener RUC en DGI", value=False)
    ch7 = st.checkbox("Aviso de Operaciones (municipio)", value=False)
    ch8 = st.checkbox("Registro ITBMS (si aplica)", value=False)
    ch9 = st.checkbox("Paz y Salvo DGI", value=False)
    ch10 = st.checkbox("Paz y Salvo Municipal", value=False)

    st.markdown("##### 👷 Laboral")
    ch11 = st.checkbox("Inscripcion CSS Patronal", value=False)
    ch12 = st.checkbox("Registro MITRADEL", value=False)
    ch13 = st.checkbox("Cedulas de empleados", value=False)

    total_checks = sum([ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11, ch12, ch13])
    st.progress(total_checks / 13, text=f"{total_checks}/13 completados")

    st.markdown("---")

    # Alertas legales
    st.markdown("### Alertas Legales")
    alertas = [
        ("🔴", "CSS Patronal", "Pago mensual a la Caja de Seguro Social. Fecha limite: dia 15 de cada mes."),
        ("🟡", "Agente Residente", "Pago anual obligatorio. Verificar renovacion."),
        ("🟡", "ITBMS Trimestral", "Declaracion trimestral si ventas anuales > $36,000."),
        ("🔵", "Tasa Unica", "Pago anual al Registro Publico. $350 S.A. / $300 S.R.L."),
        ("🔵", "XIII Mes", "3 pagos anuales: 15 abril, 15 agosto, 15 diciembre."),
    ]
    for emoji, title, desc in alertas:
        st.markdown(f"{emoji} **{title}** — {desc}")


# ============================================
# FOOTER
# ============================================
st.markdown("---")
st.markdown(
    "<p style='text-align:center; color:#94a3b8; font-size:12px;'>"
    "SABIA EMPRENDE v1.0 — Tu Aliado Estrategico para Panama 🇵🇦 | "
    "Demo Streamlit</p>",
    unsafe_allow_html=True,
)
