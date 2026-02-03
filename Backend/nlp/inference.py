import joblib
from intent_keywords import extract_intent_by_keyword

sentiment_model = joblib.load("sentiment_model.pkl")
intent_model = joblib.load("intent_model.pkl")

def predict_sentiment(text):
    return sentiment_model.predict([text])[0]

def predict_multi_intent(text):
    # STEP 1: keyword
    intent, keyword = extract_intent_by_keyword(text)
    trace = []

    if intent:
        trace.append(f"KEYWORD:{intent}({keyword})")
        return (intent, "KEYWORD"), trace

    # STEP 2: fallback model
    model_intent = intent_model.predict([text])[0]
    trace.append(f"MODEL:{model_intent}")
    return (model_intent, "MODEL"), trace
