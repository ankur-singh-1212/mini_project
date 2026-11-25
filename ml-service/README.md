# NexaResolve ML Service

FastAPI service for complaint category classification.

## Setup
```sh
python3 -m pip install -r requirements.txt
```

## Train
```sh
python3 train_model.py
```

## Run
```sh
python3 -m uvicorn app:app --reload --port 8000
```

## Endpoint
POST /predict/category
```json
{ "text": "Wi-Fi not working in library" }
```
Response:
```json
{ "label": "Network and Internet", "confidence": 0.3, ... }
```

## Dataset
`data/complaints.csv` starter demonstration dataset. Not a large real-world dataset.
Measured accuracy saved in `models/metrics.json` (approx 0.50).
