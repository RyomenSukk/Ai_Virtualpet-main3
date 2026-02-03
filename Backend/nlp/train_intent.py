# train_intent.py
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import pandas as pd
import joblib

df = pd.read_csv("data/intent.csv")

model = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            tokenizer=str.split,
            ngram_range=(1, 2),     # 👈 จับ keyword + วลี
            min_df=1
        )
    ),
    (
        "clf",
        LogisticRegression(
            max_iter=1000,
            class_weight="balanced"  # 👈 กัน bias
        )
    )
])

model.fit(df["text"], df["intent"])

joblib.dump(model, "intent_model.pkl")
print("✅ Intent model trained (hybrid-ready)")
