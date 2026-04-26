import json, urllib.request
users = ['USR-15022', 'USR-05719', 'USR-03688', 'USR-07552', 'USR-11034']
for u in users:
    try:
        url = 'http://127.0.0.1:8000/context/full/' + u
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read())
            metrics = data['havi_context']['uc2']['metrics']
            print(u, metrics.get('zona_riesgo'), metrics.get('tendencia_riesgo'))
    except Exception as e:
        print(u, e)
