import pandas as pd
import datetime

def validate_cutoff_dates(transactions_path, conversations_path, target_date_str='2025-11-28'):
    print(f"--- Iniciando validación del período de cierre: {target_date_str} ---")
    
    # 1. Cargar datasets
    print("\nCargando datasets (esto puede tomar unos segundos)...")
    try:
        df_txn = pd.read_csv(transactions_path, usecols=['fecha_hora'])
        df_conv = pd.read_csv(conversations_path, usecols=['date'])
    except Exception as e:
        print(f"Error cargando datasets: {e}")
        return

    # 2. Convertir a datetime
    print("Convirtiendo fechas...")
    df_txn['fecha_hora'] = pd.to_datetime(df_txn['fecha_hora'], errors='coerce')
    df_conv['date'] = pd.to_datetime(df_conv['date'], errors='coerce')

    # 3. Validar fecha máxima (Intersección)
    max_txn_date = df_txn['fecha_hora'].max()
    max_conv_date = df_conv['date'].max()
    
    print("\n1. VALIDACIÓN DE FECHA MÁXIMA")
    print(f"   Fecha máxima en transacciones: {max_txn_date}")
    print(f"   Fecha máxima en conversaciones: {max_conv_date}")
    
    target_date = pd.to_datetime(target_date_str).date()
    
    if max_txn_date.date() == target_date and max_conv_date.date() == target_date:
        print(f"   [EXITO]: Ambos datasets terminan exactamente el {target_date_str}.")
    else:
        print(f"   [DISCREPANCIA]: Las fechas máximas no coinciden exactamente con {target_date_str}.")
        intersection_date = min(max_txn_date, max_conv_date).date()
        print(f"   [INFO]: La verdadera fecha máxima común (intersección) es: {intersection_date}")

    # 4. Validar volumen cerca de la fecha de corte
    print("\n2. VALIDACIÓN DE VOLUMEN CERCA DE LA FECHA DE CORTE")
    
    cutoff_datetime = min(max_txn_date, max_conv_date)
    
    def analyze_volume(df, date_col, dataset_name):
        total_rows = len(df)
        
        # Extraer año-mes para agrupar
        df['year_month'] = df[date_col].dt.to_period('M')
        monthly_counts = df['year_month'].value_counts().sort_index()
        
        print(f"\n   Distribución mensual en {dataset_name} (Total: {total_rows}):")
        for period, count in monthly_counts.items():
            percentage = (count / total_rows) * 100
            print(f"      {period}: {count} registros ({percentage:.2f}%)")
            
        # Volumen reciente (últimas 4 semanas antes del corte)
        print(f"\n   Volumen en las últimas 4 semanas antes del {cutoff_datetime.date()} en {dataset_name}:")
        for i in range(4):
            end_date = cutoff_datetime - pd.DateOffset(weeks=i)
            start_date = cutoff_datetime - pd.DateOffset(weeks=i+1)
            
            mask = (df[date_col] > start_date) & (df[date_col] <= end_date)
            count = mask.sum()
            percentage = (count / total_rows) * 100
            print(f"      Semana del {start_date.date()} al {end_date.date()}: {count} registros ({percentage:.2f}%)")
            
    analyze_volume(df_txn, 'fecha_hora', 'Transacciones')
    analyze_volume(df_conv, 'date', 'Conversaciones')
    
    print("\n--- Validación Completada ---")

if __name__ == "__main__":
    txn_path = r"C:\Users\nanoj\Documents\GitHub\Datathon-2026\Datathon_Hey_2026_dataset_transacciones 1\dataset_transacciones\hey_transacciones.csv"
    conv_path = r"C:\Users\nanoj\Documents\GitHub\Datathon-2026\Datathon_Hey_dataset_conversaciones 1\dataset_conversaciones\dataset_50k_anonymized.csv"
    validate_cutoff_dates(txn_path, conv_path)
