import json
import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE, "data", "complaints.csv")
MODEL_DIR = os.path.join(BASE, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "complaint_classifier.joblib")

os.makedirs(MODEL_DIR, exist_ok=True)

df = pd.read_csv(DATA_PATH)
X = df["text"].astype(str)
y = df["label"].astype(str)

# Stratify only if each class has enough samples
min_count = y.value_counts().min()
stratify = y if min_count >= 2 else None
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=stratify
)

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)),
    ("clf", LogisticRegression(max_iter=2000, random_state=42)),
])

pipeline.fit(X_train, y_train)
preds = pipeline.predict(X_test)
proba = pipeline.predict_proba(X_test)

accuracy = accuracy_score(y_test, preds)
report = classification_report(y_test, preds, output_dict=True, zero_division=0)
cm = confusion_matrix(y_test, preds, labels=pipeline.classes_.tolist())

metrics = {
    "accuracy": float(accuracy),
    "train_size": int(len(X_train)),
    "test_size": int(len(X_test)),
    "classification_report": report,
    "confusion_matrix": cm.tolist(),
    "labels": pipeline.classes_.tolist(),
    "note": "Starter demonstration dataset. Not a large real-world dataset.",
}
with open(os.path.join(MODEL_DIR, "metrics.json"), "w") as f:
    json.dump(metrics, f, indent=2)

joblib.dump(pipeline, MODEL_PATH)
print(json.dumps({"accuracy": metrics["accuracy"], "train": len(X_train), "test": len(X_test)}, indent=2))
print(classification_report(y_test, preds, zero_division=0))
