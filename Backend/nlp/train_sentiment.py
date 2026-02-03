import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import joblib

# Load data
df = pd.read_csv("data/sentiment.csv")

X = df["text"]
y = df["label"]

# Train / Test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# NLP Pipeline
model = Pipeline([
    ("tfidf", TfidfVectorizer(tokenizer=str.split)),
    ("clf", MultinomialNB())
])

# Train
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# Save model
joblib.dump(model, "sentiment_model.pkl")
print("✅ Sentiment model saved")
