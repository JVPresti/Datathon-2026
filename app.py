"""
Havi — Copiloto Financiero Proactivo
Demo end-to-end para Datathon DSC x Hey 2026

Run with:  streamlit run app.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import streamlit as st
import pandas as pd
import json

from src.integration.data_loader import load_all
from src.integration import uc1, uc2, uc3, uc4

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Havi · Demo Hey 2026",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Custom CSS — Hey Banco brand ────────────────────────────────────────────────
st.markdown("""
<style>
/* ── Global ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

/* ── Header ── */
.hey-header {
    background: linear-gradient(135deg, #FF5A1F 0%, #FF8C5A 100%);
    border-radius: 16px;
    padding: 28px 36px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
}
.hey-header h1 {
    color: white !important;
    font-size: 2.2rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.1;
}
.hey-header p {
    color: rgba(255,255,255,0.88);
    font-size: 1rem;
    margin: 4px 0 0 0;
}

/* ── Havi message bubble ── */
.havi-bubble {
    background: linear-gradient(135deg, #1A1C2E 0%, #23263A 100%);
    border-left: 4px solid #FF5A1F;
    border-radius: 12px;
    padding: 20px 24px;
    margin: 16px 0;
    position: relative;
}
.havi-bubble .havi-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #FF8C5A;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
}
.havi-bubble .havi-text {
    font-size: 1.05rem;
    color: #F0F2F6;
    line-height: 1.6;
}

/* ── Metric card ── */
.kpi-card {
    background: #1A1C2E;
    border-radius: 12px;
    padding: 18px 20px;
    text-align: center;
    border: 1px solid #2D3050;
}
.kpi-card .kpi-value {
    font-size: 1.9rem;
    font-weight: 700;
    color: #FF5A1F;
    line-height: 1.1;
}
.kpi-card .kpi-label {
    font-size: 0.78rem;
    color: #8B93B8;
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

/* ── Alert badges ── */
.badge-critico  { background:#FF4B4B22; color:#FF4B4B; border:1px solid #FF4B4B55; }
.badge-precaucion { background:#FFB80022; color:#FFB800; border:1px solid #FFB80055; }
.badge-saludable { background:#00C89622; color:#00C896; border:1px solid #00C89655; }
.badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 600;
}

/* ── Action result box ── */
.result-box-success {
    background: #00C89610;
    border: 1px solid #00C89640;
    border-radius: 10px;
    padding: 16px 20px;
    color: #00C896;
}
.result-box-error {
    background: #FF4B4B10;
    border: 1px solid #FF4B4B40;
    border-radius: 10px;
    padding: 16px 20px;
    color: #FF4B4B;
}

/* ── Tab labels ── */
.stTabs [data-baseweb="tab"] {
    font-weight: 600;
    font-size: 0.92rem;
    padding: 10px 20px;
}
.stTabs [aria-selected="true"] {
    color: #FF5A1F !important;
}

/* ── Section divider ── */
.section-title {
    font-size: 0.7rem;
    font-weight: 700;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 20px 0 8px 0;
}

/* ── Impact chip ── */
.impact-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 8px 0;
}
.impact-chip {
    background: #FF5A1F18;
    border: 1px solid #FF5A1F44;
    color: #FF8C5A;
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 500;
}
</style>
""", unsafe_allow_html=True)


# ── Data loading (cached) ────────────────────────────────────────────────────
@st.cache_data(show_spinner="Cargando datos de Hey Banco…")
def get_data():
    return load_all()


@st.cache_data(show_spinner=False)
def get_uc1_cands(_dfs):
    return uc1.get_uc1_candidates(_dfs)

@st.cache_data(show_spinner=False)
def get_uc2_cands(_dfs):
    return uc2.get_uc2_candidates(_dfs)

@st.cache_data(show_spinner=False)
def get_uc3_cands(_dfs):
    return uc3.get_uc3_candidates(_dfs)

@st.cache_data(show_spinner=False)
def get_uc4_cands(_dfs):
    return uc4.get_uc4_candidates(_dfs)


dfs = get_data()


# ══════════════════════════════════════════════════════════════════════════════
# HEADER
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("""
<div class="hey-header">
  <div style="font-size:3rem;line-height:1">🤖</div>
  <div>
    <h1>Havi</h1>
    <p>Tu copiloto financiero proactivo · Datathon DSC x Hey 2026</p>
  </div>
  <div style="margin-left:auto;text-align:right;color:rgba(255,255,255,0.7);font-size:0.85rem">
    <strong style="color:white;font-size:1.1rem">802K</strong> transacciones<br>
    <strong style="color:white;font-size:1.1rem">50K</strong> conversaciones<br>
    <strong style="color:white;font-size:1.1rem">4</strong> casos de uso
  </div>
</div>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# TABS
# ══════════════════════════════════════════════════════════════════════════════
tab1, tab2, tab3, tab4 = st.tabs([
    "🔔 UC1 · Asistente Proactivo",
    "💡 UC2 · Gemelo Digital",
    "⭐ UC3 · Upselling Hey Pro",
    "🛡️ UC4 · Seguridad",
])


# ══════════════════════════════════════════════════════════════════════════════
# UC1 — ASISTENTE PROACTIVO
# ══════════════════════════════════════════════════════════════════════════════
with tab1:
    st.markdown("### 🔔 Asistente Financiero Proactivo")
    st.caption("Havi detecta rechazos resolubles y propone una transferencia inmediata antes de que el usuario lo note.")

    cands1 = get_uc1_cands(dfs)

    col_sel, col_main, col_act = st.columns([1.4, 2.2, 1.6])

    with col_sel:
        st.markdown('<div class="section-title">Seleccionar transacción rechazada</div>', unsafe_allow_html=True)
        if cands1.empty:
            st.warning("No se encontraron candidatos UC1 en el dataset.")
        else:
            selected_label1 = st.selectbox(
                "Transacción",
                cands1["label"].tolist(),
                label_visibility="collapsed",
            )
            row1 = cands1[cands1["label"] == selected_label1].iloc[0]
            txn_id1 = row1["transaccion_id"]
            user_id1 = row1["user_id"]

            try:
                ctx1 = uc1.build_context_uc1(txn_id1, user_id1, dfs)

                st.markdown('<div class="section-title">Contexto del rechazo</div>', unsafe_allow_html=True)
                st.markdown(f"""
                <div class="kpi-card" style="margin-bottom:10px">
                  <div class="kpi-value">${ctx1['monto_rechazado']:,.0f}</div>
                  <div class="kpi-label">Monto rechazado</div>
                </div>
                """, unsafe_allow_html=True)

                motivo_color = "#FF4B4B" if ctx1["situacion"] == "rechazo_por_saldo" else "#FFB800"
                st.markdown(f"""
                <div style="background:#1A1C2E;border-radius:10px;padding:14px;font-size:0.85rem;color:#C5C8D6;margin-top:8px">
                  <b style="color:{motivo_color}">⚠ {ctx1['motivo'].replace('_', ' ').title()}</b><br>
                  📍 {ctx1['ciudad_transaccion']}<br>
                  🏪 {ctx1['comercio']}<br>
                  🕐 {str(ctx1['fecha_hora'])[:16]}<br>
                  {'🌍 Internacional' if ctx1['es_internacional'] else '🇲🇽 Nacional'}<br>
                  {'🔁 Usuario crónico' if ctx1['es_cronico'] else ''}
                </div>
                """, unsafe_allow_html=True)
            except Exception as e:
                st.error(f"Error: {e}")
                ctx1 = None

    with col_main:
        if cands1.empty or ctx1 is None:
            st.info("Selecciona una transacción para ver el análisis de Havi.")
        else:
            # Havi message
            if ctx1["tiene_alternativo"]:
                prod_nombre = ctx1["producto_alternativo"].replace("_", " ").title()
                monto_disp = ctx1["monto_disponible_alternativo"]
                if ctx1["es_cronico"]:
                    havi_msg = (
                        f"Hola, noté que has tenido varios rechazos últimamente. "
                        f"Tu compra de **${ctx1['monto_rechazado']:,.2f}** en {ctx1['comercio']} fue rechazada, "
                        f"pero tienes **${monto_disp:,.2f}** disponibles en tu {prod_nombre}. "
                        f"¿Quieres que lo transfiera ahora? También podemos revisar juntos cómo optimizar tu liquidez."
                    )
                else:
                    havi_msg = (
                        f"Tu compra de **${ctx1['monto_rechazado']:,.2f}** en {ctx1['comercio']} fue rechazada "
                        f"por {ctx1['motivo'].replace('_', ' ')}. "
                        f"Pero tranquil@, tienes **${monto_disp:,.2f}** disponibles en tu {prod_nombre}. "
                        f"¿Quieres que complete la compra desde ahí?"
                    )
            else:
                havi_msg = (
                    f"Tu compra de **${ctx1['monto_rechazado']:,.2f}** en {ctx1['comercio']} fue rechazada. "
                    f"En este momento no identifico un producto con saldo suficiente para cubrirla. "
                    f"¿Te ayudo a gestionar la situación?"
                )

            st.markdown(f"""
            <div class="havi-bubble">
              <div class="havi-label">🤖 Havi dice</div>
              <div class="havi-text">{havi_msg}</div>
            </div>
            """, unsafe_allow_html=True)

            st.markdown('<div class="section-title">Payload JSON enviado a Havi</div>', unsafe_allow_html=True)
            with st.expander("Ver contexto completo", expanded=False):
                st.json(ctx1)

    with col_act:
        if ctx1 is not None and ctx1.get("tiene_alternativo"):
            st.markdown('<div class="section-title">Acción</div>', unsafe_allow_html=True)
            prod_nombre = ctx1["producto_alternativo"].replace("_", " ").title()
            st.markdown(f"""
            <div style="background:#1A1C2E;border-radius:10px;padding:14px;margin-bottom:12px;font-size:0.85rem;color:#C5C8D6">
              <b style="color:#FF8C5A">📤 transferFunds()</b><br><br>
              De: <b>{prod_nombre}</b><br>
              Monto: <b style="color:#FF5A1F">${ctx1['monto_rechazado']:,.2f}</b>
            </div>
            """, unsafe_allow_html=True)

            if st.button("💸 Transferir ahora", key="btn_transfer", use_container_width=True,
                         type="primary"):
                result = uc1.transferFunds(
                    ctx1["producto_alternativo_id"],
                    ctx1["transaccion_id"],
                    ctx1["monto_rechazado"],
                    user_id1,
                )
                if result["success"]:
                    st.markdown(f"""
                    <div class="result-box-success">
                      ✅ <b>{result['message']}</b><br>
                      <small>Transfer ID: {result['transfer_id']} · SLA: {result['sla_seg']}s</small>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f'<div class="result-box-error">❌ {result["message"]}</div>', unsafe_allow_html=True)

            if st.button("✋ No, gracias", key="btn_reject1", use_container_width=True):
                st.markdown("""
                <div style="background:#2A1F1A;border:1px solid #FF5A1F44;border-radius:10px;padding:14px;font-size:0.85rem;color:#FF8C5A">
                  Entendido. No molestaré con esta sugerencia en las próximas <b>24 horas</b>.
                </div>
                """, unsafe_allow_html=True)

        st.markdown('<div class="section-title">Impacto UC1</div>', unsafe_allow_html=True)
        st.markdown("""
        <div class="impact-row">
          <span class="impact-chip">5,079 usuarios afectados</span>
          <span class="impact-chip">81.4% cobertura</span>
          <span class="impact-chip">p95 &lt; 100ms</span>
          <span class="impact-chip">$5,446 monto promedio</span>
        </div>
        """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# UC2 — GEMELO DIGITAL
# ══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.markdown("### 💡 Gemelo Digital — Alerta de Liquidez")
    st.caption("Havi construye un perfil conductual de cada usuario y alerta cuando el gasto proyectado supera el ingreso.")

    cands2 = get_uc2_cands(dfs)

    col_sel2, col_main2, col_act2 = st.columns([1.4, 2.2, 1.6])

    with col_sel2:
        st.markdown('<div class="section-title">Seleccionar usuario</div>', unsafe_allow_html=True)
        if cands2.empty:
            st.warning("No se encontraron usuarios en zona de riesgo.")
        else:
            selected_label2 = st.selectbox(
                "Usuario",
                cands2["label"].tolist(),
                label_visibility="collapsed",
            )
            row2 = cands2[cands2["label"] == selected_label2].iloc[0]
            user_id2 = row2["user_id"]

            try:
                ctx2 = uc2.build_context_uc2(user_id2, dfs)

                zona = ctx2["zona_riesgo"]
                badge_cls = {
                    "Crítico": "badge-critico",
                    "Critica": "badge-critico",
                    "Precaucion": "badge-precaucion",
                    "Precaución": "badge-precaucion",
                    "Saludable": "badge-saludable",
                }.get(zona, "badge-precaucion")

                st.markdown(f'<span class="badge {badge_cls}">{zona}</span>', unsafe_allow_html=True)
                st.markdown(f"""
                <div style="background:#1A1C2E;border-radius:10px;padding:14px;font-size:0.85rem;color:#C5C8D6;margin-top:10px">
                  Score riesgo: <b style="color:#FF5A1F">{ctx2['score_riesgo']:.3f}</b><br>
                  Tendencia: <b>{ctx2['tendencia_riesgo']}</b><br>
                  Δ vs mes ant: <b>{ctx2['delta_score_mensual']:+.3f}</b><br>
                  Ingreso mensual: <b>${ctx2['ingreso_mensual']:,.0f}</b><br>
                  Carga fija: <b>${ctx2['mensualidades_pendientes']:,.0f}</b><br>
                  Categoría problema: <b>{ctx2['categoria_problema']}</b><br>
                  Días al corte: <b>{ctx2['dias_al_corte']}</b>
                </div>
                """, unsafe_allow_html=True)
            except Exception as e:
                st.error(f"Error: {e}")
                ctx2 = None

    with col_main2:
        if cands2.empty or ctx2 is None:
            st.info("Selecciona un usuario para ver el análisis de Havi.")
        else:
            zona = ctx2["zona_riesgo"]
            deficit = ctx2["deficit_proyectado"]
            cat = ctx2["categoria_problema"]
            gasto_est = ctx2["gasto_estimado_fin_mes"]
            ingreso = ctx2["ingreso_mensual"]
            carga = ctx2["mensualidades_pendientes"]

            # KPI row
            c1, c2, c3 = st.columns(3)
            with c1:
                st.metric("💰 Ingreso", f"${ingreso:,.0f}")
            with c2:
                st.metric("📊 Gasto estimado", f"${gasto_est:,.0f}",
                          delta=f"{gasto_est - ingreso:+,.0f}" if gasto_est > 0 else None,
                          delta_color="inverse")
            with c3:
                balance_color = "normal" if deficit >= 0 else "inverse"
                st.metric("⚖️ Balance proyectado", f"${deficit:,.0f}", delta_color=balance_color)

            # Havi message
            if zona in ("Crítico", "Critica") or deficit < 0:
                havi_msg2 = (
                    f"🚨 **Alerta importante:** tu gasto proyectado de este mes (${gasto_est:,.0f}) "
                    f"más tus compromisos fijos (${carga:,.0f}) supera tu ingreso mensual de ${ingreso:,.0f}. "
                    f"El mayor riesgo está en **{cat}**. "
                    f"¿Quieres que configure un límite de gasto para esa categoría?"
                )
            elif zona in ("Precaucion", "Precaución"):
                havi_msg2 = (
                    f"⚠️ Tus finanzas están en zona de precaución este mes. "
                    f"Tu gasto en **{cat}** está subiendo. "
                    f"Con tus compromisos fijos de ${carga:,.0f}, te queda un margen de **${deficit:,.0f}**. "
                    f"¿Configuramos un límite para mantenerte en verde?"
                )
            else:
                havi_msg2 = (
                    f"✅ Tus finanzas están saludables este mes. "
                    f"Tienes un margen de **${deficit:,.0f}** después de tus compromisos. "
                    f"Sigue así, ¡vas muy bien!"
                )

            st.markdown(f"""
            <div class="havi-bubble">
              <div class="havi-label">🤖 Havi dice</div>
              <div class="havi-text">{havi_msg2}</div>
            </div>
            """, unsafe_allow_html=True)

            with st.expander("Ver contexto completo (payload UC2)", expanded=False):
                st.json(ctx2)

    with col_act2:
        if ctx2 is not None:
            st.markdown('<div class="section-title">Configurar límite de categoría</div>', unsafe_allow_html=True)
            cat_default = ctx2["categoria_problema"]
            categoria_input = st.text_input("Categoría", value=cat_default, key="uc2_cat")
            limite_input = st.number_input(
                "Límite mensual (MXN)",
                min_value=100,
                max_value=50000,
                value=max(500, int(ctx2["ingreso_mensual"] * 0.15)),
                step=100,
                key="uc2_limite",
            )
            st.markdown(f"""
            <div style="background:#1A1C2E;border-radius:10px;padding:10px 14px;margin:8px 0;font-size:0.82rem;color:#8B93B8">
              <b style="color:#FF8C5A">setCategoryBudgetLimit()</b><br>
              user_id: {user_id2}<br>categoria: {categoria_input}
            </div>
            """, unsafe_allow_html=True)

            if st.button("✅ Configurar límite", key="btn_budget", use_container_width=True, type="primary"):
                result2 = uc2.setCategoryBudgetLimit(user_id2, categoria_input, float(limite_input))
                if result2["success"]:
                    st.markdown(f"""
                    <div class="result-box-success">
                      ✅ <b>{result2['message']}</b>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f'<div class="result-box-error">❌ {result2["message"]}</div>', unsafe_allow_html=True)

        st.markdown('<div class="section-title">Impacto UC2</div>', unsafe_allow_html=True)
        n_riesgo = dfs["score_riesgo"][dfs["score_riesgo"]["zona_riesgo"] != "Saludable"].shape[0]
        st.markdown(f"""
        <div class="impact-row">
          <span class="impact-chip">{n_riesgo:,} usuarios en riesgo</span>
          <span class="impact-chip">AUC 0.9999</span>
          <span class="impact-chip">RF F1: 0.93</span>
        </div>
        """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# UC3 — UPSELLING HEY PRO
# ══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.markdown("### ⭐ Upselling Inteligente — Hey Pro")
    st.caption("Havi muestra exactamente cuánto cashback pierde el usuario cada mes y facilita la activación con 1 clic.")

    cands3 = get_uc3_cands(dfs)

    col_sel3, col_main3, col_act3 = st.columns([1.4, 2.2, 1.6])

    with col_sel3:
        st.markdown('<div class="section-title">Seleccionar usuario (no-Pro)</div>', unsafe_allow_html=True)
        if cands3.empty:
            st.warning("No se encontraron candidatos de upselling.")
        else:
            selected_label3 = st.selectbox(
                "Usuario",
                cands3["label"].tolist(),
                label_visibility="collapsed",
            )
            row3 = cands3[cands3["label"] == selected_label3].iloc[0]
            user_id3 = row3["user_id"]

            try:
                ctx3 = uc3.build_context_uc3(user_id3, dfs)

                seg_color = {"A": "#FF5A1F", "B": "#FFB800", "C": "#6B7280"}[ctx3["segmento"]]
                st.markdown(f"""
                <div style="background:#1A1C2E;border-radius:10px;padding:14px;font-size:0.85rem;color:#C5C8D6;margin-top:10px">
                  Segmento: <b style="color:{seg_color}">{ctx3['segmento']}</b><br>
                  Propensión: <b>{ctx3['score_propension']:.0%}</b><br>
                  Categoría top: <b>{ctx3['top_categoria_perdida']}</b><br>
                  Nómina Hey: <b>{'✅ Sí' if ctx3['ya_tiene_nomina'] else '❌ No'}</b><br>
                  Pasos activación: <b>{ctx3['pasos_activacion']}</b><br>
                  Último login: hace <b>{ctx3['dias_desde_ultimo_login']} días</b>
                </div>
                """, unsafe_allow_html=True)
            except Exception as e:
                st.error(f"Error: {e}")
                ctx3 = None

    with col_main3:
        if cands3.empty or ctx3 is None:
            st.info("Selecciona un usuario para ver la oportunidad de upselling.")
        else:
            cb_mes = ctx3["cashback_perdido_mes"]
            cb_anual = ctx3["cashback_anual_estimado"]
            cat = ctx3["top_categoria_perdida"]
            pasos = ctx3["pasos_activacion"]

            c1, c2 = st.columns(2)
            with c1:
                st.markdown(f"""
                <div class="kpi-card">
                  <div class="kpi-value">${cb_mes:,.0f}</div>
                  <div class="kpi-label">Cashback perdido / mes</div>
                </div>
                """, unsafe_allow_html=True)
            with c2:
                st.markdown(f"""
                <div class="kpi-card">
                  <div class="kpi-value">${cb_anual:,.0f}</div>
                  <div class="kpi-label">Cashback perdido / año</div>
                </div>
                """, unsafe_allow_html=True)

            st.markdown("<br>", unsafe_allow_html=True)

            if ctx3["ya_tiene_nomina"]:
                havi_msg3 = (
                    f"El mes pasado perdiste **${cb_mes:,.2f} MXN** en cashback en {cat}. "
                    f"Al año eso son **${cb_anual:,.0f} MXN** que podrías llevarte de vuelta. "
                    f"Ya tienes tu nómina en Hey — activar **Hey Pro** es un solo clic. ¿Lo hacemos?"
                )
            else:
                havi_msg3 = (
                    f"El mes pasado perdiste **${cb_mes:,.2f} MXN** en cashback. "
                    f"Al año eso equivale a **${cb_anual:,.0f} MXN** que se van sin necesidad. "
                    f"Con Hey Pro ganarías 1% en cada compra de {cat}. "
                    f"Solo necesitas domiciliar tu nómina — son {pasos} pasos y te ayudo ahora mismo."
                )

            st.markdown(f"""
            <div class="havi-bubble">
              <div class="havi-label">🤖 Havi dice</div>
              <div class="havi-text">{havi_msg3}</div>
            </div>
            """, unsafe_allow_html=True)

            with st.expander("Ver contexto completo (payload UC3)", expanded=False):
                st.json(ctx3)

    with col_act3:
        if ctx3 is not None:
            st.markdown('<div class="section-title">Acción</div>', unsafe_allow_html=True)

            if ctx3["ya_tiene_nomina"]:
                st.markdown(f"""
                <div style="background:#1A1C2E;border-radius:10px;padding:10px 14px;margin:8px 0;font-size:0.82rem;color:#8B93B8">
                  <b style="color:#FF8C5A">activateHeyProDirect()</b><br>
                  1 paso · activación inmediata
                </div>
                """, unsafe_allow_html=True)
                if st.button("⭐ Activar Hey Pro ahora", key="btn_pro_direct", use_container_width=True, type="primary"):
                    result3 = uc3.activateHeyProDirect(user_id3)
                    st.markdown(f"""
                    <div class="result-box-success">
                      ✅ <b>{result3['mensaje']}</b><br>
                      <small>Beneficios: {', '.join(result3['beneficios'][:2])}</small>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div style="background:#1A1C2E;border-radius:10px;padding:10px 14px;margin:8px 0;font-size:0.82rem;color:#8B93B8">
                  <b style="color:#FF8C5A">initiatePayrollPortability()</b><br>
                  3 pasos · {ctx3['pasos_activacion']} pasos
                </div>
                """, unsafe_allow_html=True)
                if st.button("💼 Iniciar portabilidad de nómina", key="btn_nomina", use_container_width=True, type="primary"):
                    result3b = uc3.initiatePayrollPortability(user_id3)
                    clabe = result3b["clabe_destino"]
                    st.markdown(f"""
                    <div class="result-box-success">
                      ✅ <b>{result3b['message']}</b><br><br>
                      <b>CLABE:</b> <code>{clabe}</code><br>
                      <small>SLA: {result3b['sla_dias']} días hábiles</small>
                    </div>
                    """, unsafe_allow_html=True)

            st.markdown("<br>", unsafe_allow_html=True)
            if st.button("✋ No me interesa", key="btn_reject3", use_container_width=True):
                st.markdown("""
                <div style="background:#1A1D2B;border:1px solid #444;border-radius:10px;padding:12px;font-size:0.82rem;color:#8B93B8">
                  Entendido. No volveré a mencionarlo en los próximos <b>30 días</b>.<br>
                  Si cambias de opinión, solo pregúntame por "Hey Pro".
                </div>
                """, unsafe_allow_html=True)

        st.markdown('<div class="section-title">Impacto UC3</div>', unsafe_allow_html=True)
        total_cashback = dfs["cashback_perdido"]["cashback_perdido_mes"].sum()
        n_seg_a = (dfs["cashback_perdido"]["cashback_perdido_mes"] >= 300).sum()
        st.markdown(f"""
        <div class="impact-row">
          <span class="impact-chip">${total_cashback:,.0f} MXN/mes perdido</span>
          <span class="impact-chip">{n_seg_a} usuarios Seg. A</span>
          <span class="impact-chip">51.1% sin Hey Pro</span>
        </div>
        """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# UC4 — SEGURIDAD
# ══════════════════════════════════════════════════════════════════════════════
with tab4:
    st.markdown("### 🛡️ Seguridad — Detección de Anomalías")
    st.caption("Havi detecta transacciones atípicas en tiempo real y pide confirmación al usuario antes de liberar o bloquear.")

    cands4 = get_uc4_cands(dfs)

    col_sel4, col_main4, col_act4 = st.columns([1.4, 2.2, 1.6])

    with col_sel4:
        st.markdown('<div class="section-title">Seleccionar transacción atípica</div>', unsafe_allow_html=True)
        if cands4.empty:
            st.warning("No se encontraron transacciones atípicas.")
        else:
            selected_label4 = st.selectbox(
                "Transacción",
                cands4["label"].tolist(),
                label_visibility="collapsed",
            )
            row4 = cands4[cands4["label"] == selected_label4].iloc[0]
            txn_id4 = row4["transaccion_id"]
            user_id4 = row4["user_id"]

            canal_sel = st.radio(
                "Canal de alerta",
                ["💬 chat", "🎙️ voz"],
                horizontal=True,
                key="canal_uc4",
            )
            canal4 = "chat" if "chat" in canal_sel else "voz"

            try:
                ctx4 = uc4.build_context_uc4(txn_id4, user_id4, dfs, canal=canal4)

                tags = []
                if ctx4["es_internacional"]:
                    tags.append("🌍 Internacional")
                if ctx4["es_nocturna"]:
                    tags.append("🌙 Nocturna")
                tags.append(f"Score: {ctx4['anomaly_score']:.1f}")

                st.markdown(f"""
                <div style="background:#1A1C2E;border-radius:10px;padding:14px;font-size:0.85rem;color:#C5C8D6;margin-top:10px">
                  Monto: <b style="color:#FF4B4B">${ctx4['monto']:,.0f}</b><br>
                  Comercio: <b>{ctx4['comercio']}</b><br>
                  Ciudad: <b>{ctx4['ciudad_transaccion']}</b><br>
                  Hora: <b>{ctx4['hora_del_dia']:02d}:00</b><br>
                  {' · '.join(tags)}
                </div>
                """, unsafe_allow_html=True)
            except Exception as e:
                st.error(f"Error: {e}")
                ctx4 = None

    with col_main4:
        if cands4.empty or ctx4 is None:
            st.info("Selecciona una transacción atípica para ver la alerta de Havi.")
        else:
            mensaje_havi4 = uc4.format_havi_message(ctx4, canal=canal4)

            if canal4 == "voz":
                extra = '<br><small style="color:#6B7280">📢 Mensaje optimizado para voz: corto, sin emojis, respuesta binaria</small>'
            else:
                extra = '<br><small style="color:#6B7280">💬 Mensaje optimizado para chat: más detalle, emojis admitidos</small>'

            st.markdown(f"""
            <div class="havi-bubble">
              <div class="havi-label">🤖 Havi dice {'(🎙️ voz)' if canal4 == 'voz' else '(💬 chat)'}</div>
              <div class="havi-text">{mensaje_havi4}{extra}</div>
            </div>
            """, unsafe_allow_html=True)

            # SLA info
            st.markdown("""
            <div style="background:#1A1C2E;border-radius:10px;padding:14px;font-size:0.82rem;color:#C5C8D6;margin-top:8px">
              <b style="color:#FF8C5A">⏱ SLAs del flujo</b><br>
              Rama A (Sí, fui yo): <b style="color:#00C896">5 seg</b><br>
              Rama B (No fui yo): <b style="color:#FFB800">10 seg</b><br>
              Timeout sin respuesta: <b style="color:#FF4B4B">10 min → en_disputa</b><br>
              <small>Basado en corpus: 87% responden en &lt;8 min (n=3,063 turnos de voz)</small>
            </div>
            """, unsafe_allow_html=True)

            with st.expander("Ver contexto completo (payload UC4)", expanded=False):
                st.json(ctx4)

    with col_act4:
        if ctx4 is not None:
            st.markdown('<div class="section-title">Respuesta del usuario</div>', unsafe_allow_html=True)

            prod_id4 = ctx4.get("producto_id", "PRD-UNKNOWN")

            col_yes, col_no = st.columns(2)
            with col_yes:
                if st.button("✅ Sí, fui yo", key="btn_approve", use_container_width=True, type="primary"):
                    result4a = uc4.approveFlaggedTransaction(txn_id4)
                    st.markdown(f"""
                    <div class="result-box-success">
                      <b>{result4a['message']}</b><br>
                      <small>Estatus: {result4a['estatus_resultante']} · SLA: {result4a['sla_objetivo_seg']}s</small>
                    </div>
                    """, unsafe_allow_html=True)

            with col_no:
                if st.button("🚫 No fui yo", key="btn_block", use_container_width=True):
                    result4b = uc4.blockCardAndRevert(txn_id4, prod_id4)
                    st.markdown(f"""
                    <div class="result-box-error" style="color:#FF8C5A;background:#FF5A1F10;border-color:#FF5A1F44">
                      <b>{result4b['message']}</b><br>
                      <small>Disputa: {result4b['disputa_id']}</small>
                    </div>
                    """, unsafe_allow_html=True)

            st.markdown("""
            <div style="background:#1A1D2B;border:1px solid #333;border-radius:10px;padding:12px;font-size:0.78rem;color:#6B7280;margin-top:12px">
              ⏳ Sin respuesta en <b>10 minutos</b>:<br>
              → Transacción en retención<br>
              → Reintento por canal alternativo<br>
              → Escalación a backoffice a 30 min
            </div>
            """, unsafe_allow_html=True)

        st.markdown('<div class="section-title">Impacto UC4</div>', unsafe_allow_html=True)
        n_atip = len(cands4)
        st.markdown(f"""
        <div class="impact-row">
          <span class="impact-chip">{n_atip:,} txn atípicas detectadas</span>
          <span class="impact-chip">5.17% del total</span>
          <span class="impact-chip">IsolationForest</span>
          <span class="impact-chip">SLA &lt;30s</span>
        </div>
        """, unsafe_allow_html=True)


# ── Footer ─────────────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    '<div style="text-align:center;color:#4B5563;font-size:0.8rem">'
    "datamoles · Datathon DSC x Hey 2026 · "
    "Fernando Haro · Brayan Ivan · Jorge Vázquez · Diego Quirós"
    "</div>",
    unsafe_allow_html=True,
)
