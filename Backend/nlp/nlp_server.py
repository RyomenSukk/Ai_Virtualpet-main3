# ไฟล์: Backend/nlp/nlp_server.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
from intent_keywords import extract_intent_by_keyword

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True
    )

# โหลด models
sentiment_model = joblib.load("sentiment_model.pkl")
intent_model = joblib.load("intent_model.pkl")

@app.route('/api/nlp/analyze', methods=['POST'])
def analyze_text():
    """
    รับข้อความ → วิเคราะห์ sentiment + intent
    """
    data = request.json
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    
    # 1. Predict sentiment
    sentiment = sentiment_model.predict([text])[0]
    
    # 2. Predict intent (hybrid: keyword + model)
    intent, keyword = extract_intent_by_keyword(text)
    method = "KEYWORD"
    
    if not intent:
        intent = intent_model.predict([text])[0]
        method = "MODEL"
    
    return jsonify({
        'text': text,
        'sentiment': sentiment,
        'intent': intent,
        'method': method,
        'keyword': keyword
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("🤖 NLP Server starting on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)

