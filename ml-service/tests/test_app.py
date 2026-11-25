import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["model_loaded"] is True

def test_predict():
    r = client.post("/predict/category", json={"text": "Wi-Fi not working in library"})
    assert r.status_code == 200
    data = r.json()
    assert "label" in data
    assert 0 <= data["confidence"] <= 1

def test_empty():
    r = client.post("/predict/category", json={"text": ""})
    assert r.status_code == 400
