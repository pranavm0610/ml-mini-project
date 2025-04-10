import os
import sys
import io
import json
import glob
from django.http import JsonResponse
from django.conf import settings
from django.core.wsgi import get_wsgi_application
from django.urls import path
from django.core.management import execute_from_command_line
from django.views.decorators.csrf import csrf_exempt

import joblib
import re
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
import nltk
import numpy as np

settings.configure(
    DEBUG=False,
    ROOT_URLCONF=__name__,
    SECRET_KEY='1_d0nt_kn0w_what_t0_keep',
    ALLOWED_HOSTS=['*'],
    INSTALLED_APPS=[
        'corsheaders',
    ],
    MIDDLEWARE=[
        'corsheaders.middleware.CorsMiddleware',
        'django.middleware.common.CommonMiddleware',
    ],
    CORS_ALLOW_ALL_ORIGINS=True, 
)

# Ensure necessary NLTK resources are downloaded
nltk.download('stopwords')
nltk.download('punkt')
nltk.download('wordnet')

# Load stopwords
stop = set(stopwords.words('english'))

# Function to clean text
def clean_text_string(text):
    text = text.lower()
    text = re.sub(r"(@[A-Za-z0-9]+)|([^0-9A-Za-z \t])|(\w+:\/\/\S+)|^rt|http.+?", "", text)
    text = re.sub(r"\d+", "", text)
    text = ' '.join([word for word in text.split() if word not in stop])
    tokens = word_tokenize(text)
    lem_text = [WordNetLemmatizer().lemmatize(word) for word in tokens]
    return ' '.join(lem_text)

# Function to load word vectors from numpy file
def load_word_vectors():
    try:
        word_vectors_data = np.load('models/preprocessing/word_vectors.npy', allow_pickle=True)
        word_vectors = word_vectors_data.item(0) if isinstance(word_vectors_data, np.ndarray) else word_vectors_data
        vector_size = len(next(iter(word_vectors.values()))) if word_vectors else 50
        return word_vectors, vector_size
    except Exception as e:
        print(f"Error loading word vectors: {str(e)}")
        return {}, 50

# Function to convert sentence to vector using loaded word vectors
def sentence_to_vector(sentence, word_vectors, vector_size):
    words = sentence.split()
    vectors = [word_vectors[word] for word in words if word in word_vectors]
    return np.mean(vectors, axis=0) if vectors else np.zeros(vector_size)

# Function to load models based on model name
def load_models(model_name=None):
    vectorizer = None
    lda_model = None
    classifier = None
    word_vectors = {}
    vector_size = 50
    
    try:
        # Load vectorizer for traditional models
        vectorizer = joblib.load('models/preprocessing/vectorizer.pkl')
        
        # Load word vectors for ensemble models
        if model_name and 'ensemble' in model_name:
            word_vectors, vector_size = load_word_vectors()
        
        if model_name:
            # Determine if traditional or ensemble model
            if 'traditional' in model_name:
                model_path = f"models/traditional/{'_'.join(model_name.split(' '))}.pkl"
                
                # Only load LDA model if it's a traditional model with "best"
                if 'best' in model_name:
                    lda_model = joblib.load('models/preprocessing/lda.pkl')
            elif 'ensemble' in model_name:
                model_path = f"models/ensemble/{'_'.join(model_name.split(' '))}.pkl"
            else:
                model_path = None
            
            if model_path and os.path.exists(model_path):
                classifier = joblib.load(model_path)
        else:
            # Default model
            lda_model = joblib.load('models/preprocessing/lda.pkl') 
            classifier = joblib.load('models/traditional/best_svm_model.pkl')

    except FileNotFoundError as e:
        print(f"Error loading models: {str(e)}")
    
    return vectorizer, lda_model, classifier, word_vectors, vector_size

@csrf_exempt
def list_models(request):
    if request.method == 'GET':
        try:
            traditional_model_dirs = [' '.join(os.path.basename(dir_path)[:-4].split('_')) for dir_path in glob.glob('models/traditional/*.pkl')]
            ensemble_model_dirs = [' '.join(os.path.basename(dir_path)[:-4].split('_'))for dir_path in glob.glob('models/ensemble/*.pkl')]
            return JsonResponse({"available_models": {"traditional": traditional_model_dirs, "ensemble": ensemble_model_dirs}})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)

@csrf_exempt
def classify_text(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title', '')
            abstract = data.get('abstract', '')
            model_name = data.get('model', None)
            
            vectorizer, lda_model, classifier, word_vectors, vector_size = load_models(model_name)
            
            if not classifier:
                return JsonResponse({"error": f"Model '{model_name}' not found or incomplete"}, status=404)
            
            text = title + " " + abstract
            cleaned_text = clean_text_string(text)
            
            # Process text based on model type
            if model_name and 'ensemble' in model_name:
                # For ensemble models, use Word2Vec vectors
                if not word_vectors:
                    return JsonResponse({"error": "Word vectors not found for ensemble model"}, status=404)
                
                try:
                    # Get vector representation of text using word vectors
                    X_features = sentence_to_vector(cleaned_text, word_vectors, vector_size).reshape(1, -1)
                except Exception as vec_error:
                    return JsonResponse({"error": f"Error creating vector from text: {str(vec_error)}"}, status=400)
            else:
                # For traditional models
                if not vectorizer:
                    return JsonResponse({"error": "Vectorizer not found"}, status=404)
                    
                X_text_tfidf = vectorizer.transform([cleaned_text])
                
                # Apply LDA only for traditional models with "best" in name
                if model_name and 'traditional' in model_name and 'best' in model_name and lda_model:
                    if hasattr(X_text_tfidf, 'toarray'):
                        X_features = lda_model.transform(X_text_tfidf.toarray())
                    else:
                        X_features = lda_model.transform(X_text_tfidf)
                else:
                    X_features = X_text_tfidf

            labels = ['Computer Science', 'Physics', 'Mathematics', 'Statistics', 'Quantitative Biology', 'Quantitative Finance']
            predicted_labels = []
            
            predictions = classifier.predict(X_features)
            
            # Handle different prediction formats
            if isinstance(predictions, np.ndarray) and predictions.ndim > 1:
                predictions = predictions[0] if predictions.shape[0] == 1 else predictions
                for index, pred in enumerate(predictions):
                    if pred == 1:
                        predicted_labels.append(labels[index])
            else:
                predicted_class = predictions[0] if isinstance(predictions, np.ndarray) else predictions
                if isinstance(predicted_class, (int, np.integer)):
                    predicted_labels.append(labels[predicted_class])
                else:
                    predicted_labels.append(str(predicted_class))
            
            return JsonResponse({
                "predicted_labels": predicted_labels, 
                "model_used": model_name or "default"
            })
            
        except Exception as e:
            import traceback
            traceback_str = traceback.format_exc()
            return JsonResponse({"error": str(e), "traceback": traceback_str}, status=400)
    else:
        return JsonResponse({"error": "Invalid request method"}, status=405)

urlpatterns = [
    path('classify/', classify_text),
    path('models/', list_models),
]

application = get_wsgi_application()
app = application

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "__main__")
    execute_from_command_line(sys.argv)