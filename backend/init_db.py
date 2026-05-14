import chromadb
import os
import requests
import json

# Configuration
DATA_DIR = "./data"
CHROMA_PATH = "./chroma_db"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text"

# Setup ChromaDB
client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection(name="agri_knowledge")

def get_embedding(text):
    """Generate embedding for a given text using local Ollama."""
    payload = {
        "model": EMBED_MODEL,
        "prompt": text
    }
    try:
        response = requests.post(OLLAMA_EMBED_URL, json=payload)
        response.raise_for_status()
        return response.json()["embedding"]
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def ingest_data():
    """Reads all txt files in DATA_DIR and stores them in ChromaDB."""
    print(f"Checking data directory: {os.path.abspath(DATA_DIR)}")
    if not os.path.exists(DATA_DIR):
        print(f"Error: {DATA_DIR} directory not found.")
        return

    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".txt")]
    if not files:
        print("No .txt files found in data directory.")
        return

    for filename in files:
        print(f"Processing {filename}...")
        path = os.path.join(DATA_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            # Split by double newline to handle paragraphs as separate chunks
            chunks = [c.strip() for c in content.split("\n\n") if c.strip()]
            
            for i, chunk in enumerate(chunks):
                emb = get_embedding(chunk)
                if emb:
                    collection.add(
                        ids=[f"{filename}_{i}"],
                        embeddings=[emb],
                        documents=[chunk],
                        metadatas=[{"source": filename}]
                    )
                    print(f"  Added chunk {i} from {filename}")

    print("\nIngestion complete! Database saved to ./chroma_db")

if __name__ == "__main__":
    ingest_data()
