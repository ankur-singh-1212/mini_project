import os
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE, "models", "complaint_classifier.joblib")
METRICS_PATH = os.path.join(BASE, "models", "metrics.json")

app = FastAPI(title="NexaResolve ML Service")

model = None
metrics = None
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
if os.path.exists(METRICS_PATH):
    with open(METRICS_PATH) as f:
        metrics = json.load(f)

class PredictRequest(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "metrics": metrics.get("accuracy") if metrics else None}

@app.post("/predict/category")
def predict_category(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not trained")
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    proba = model.predict_proba([text])[0]
    idx = int(proba.argmax())
    label = model.classes_[idx]
    confidence = float(proba[idx])
    return {"label": label, "confidence": round(confidence, 4), "classes": list(model.classes_)}
