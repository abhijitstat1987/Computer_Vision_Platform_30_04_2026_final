import requests
r = requests.get('http://localhost:5000/api/training/jobs')
jobs = r.json()['data']
for j in jobs:
    jid = j['id']
    status = j['status']
    err = j.get('errorMessage', '')
    print(f'Job {jid}: status={status} error={err[:150]}')
