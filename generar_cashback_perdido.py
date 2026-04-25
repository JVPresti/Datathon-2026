import pandas as pd
from pathlib import Path

BASE_TXN  = Path("Datathon_Hey_2026_dataset_transacciones 1/dataset_transacciones")

print("Cargando clientes...")
df_clientes = pd.read_csv(BASE_TXN / "hey_clientes.csv", dtype={"user_id": str})

print("Cargando transacciones...")
df_transacc = pd.read_csv(BASE_TXN / "hey_transacciones.csv",
                          dtype={"transaccion_id": str, "user_id": str, "producto_id": str},
                          parse_dates=["fecha_hora"])

print("\n--- SANITY CHECK ---")
pro_users = df_transacc[df_transacc["cashback_generado"].notna()].copy()
pro_users["cashback_calculado"] = pro_users["monto"] * 0.01
match_rate = (pro_users["cashback_calculado"].round(2) == pro_users["cashback_generado"].round(2)).mean()
assert match_rate > 0.95, f"Sanity check falló: {match_rate}"
print(f"Sanity check aprobado: {match_rate:.4f} de coincidencia.")

print("\n--- IDENTIFICANDO MES ANTERIOR ---")
df_transacc['mes_anio'] = df_transacc['fecha_hora'].dt.to_period('M')
max_month = df_transacc['mes_anio'].max()
prev_month = max_month - 1
print(f"Mes máximo: {max_month}. Mes anterior utilizado para el cálculo: {prev_month}")

print("\n--- FILTRANDO DATOS ---")
no_pro_users = df_clientes[df_clientes["es_hey_pro"] == False]["user_id"].unique()
print(f"Total de usuarios sin Hey Pro: {len(no_pro_users)}")

df_filtered = df_transacc[
    (df_transacc["user_id"].isin(no_pro_users)) &
    (df_transacc["tipo_operacion"] == "compra") &
    (df_transacc["estatus"] == "completada") &
    (df_transacc["mes_anio"] == prev_month)
].copy()

print(f"Transacciones a procesar del mes {prev_month}: {len(df_filtered)}")

print("\n--- CALCULANDO CASHBACK PERDIDO ---")
df_filtered["cashback_potencial"] = df_filtered["monto"] * 0.01

# Total cashback por usuario
df_user_total = df_filtered.groupby("user_id")["cashback_potencial"].sum().reset_index()
df_user_total.rename(columns={"cashback_potencial": "cashback_perdido_mes"}, inplace=True)

# Top categoría por usuario
df_user_cat = df_filtered.groupby(["user_id", "categoria_mcc"])["cashback_potencial"].sum().reset_index()
# Ordenar para obtener el máximo
df_user_cat = df_user_cat.sort_values(["user_id", "cashback_potencial"], ascending=[True, False])
df_top_cat = df_user_cat.drop_duplicates("user_id").copy()
df_top_cat.rename(columns={
    "categoria_mcc": "top_categoria_perdida",
    "cashback_potencial": "monto_top_categoria"
}, inplace=True)

df_results = df_user_total.merge(df_top_cat, on="user_id", how="left")

# Asegurarse de que incluimos a todos los usuarios sin Hey Pro
df_all_no_pro = pd.DataFrame({"user_id": no_pro_users})
df_final = df_all_no_pro.merge(df_results, on="user_id", how="left")
df_final["cashback_perdido_mes"] = df_final["cashback_perdido_mes"].fillna(0.0)
df_final["top_categoria_perdida"] = df_final["top_categoria_perdida"].fillna("ninguna")
df_final["monto_top_categoria"] = df_final["monto_top_categoria"].fillna(0.0)

# Redondear para evitar problemas de precisión de coma flotante
df_final["cashback_perdido_mes"] = df_final["cashback_perdido_mes"].round(2)
df_final["monto_top_categoria"] = df_final["monto_top_categoria"].round(2)

output_file = "resultados_cashback_perdido.csv"
df_final.to_csv(output_file, index=False)
print(f"Resultados guardados en {output_file}")

print("\nMuestra de resultados:")
print(df_final.head(10))

print("\n--- TOP 3 CATEGORÍAS DE PÉRDIDA AGREGADAS ---")
top_3_agregado = df_filtered.groupby("categoria_mcc")["cashback_potencial"].sum().sort_values(ascending=False).head(3)
for cat, monto in top_3_agregado.items():
    print(f"- {cat}: ${monto:,.2f} MXN perdidos en total")
