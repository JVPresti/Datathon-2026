import pandas as pd

df = pd.read_csv('data/ml_ready_features.csv')
uc2_users = df[df['prob_deficit'] > 0.6].sort_values('prob_deficit', ascending=False)
print(uc2_users[['user_id', 'prob_deficit', 'ingreso_mensual_mxn']].head(10))
