import firebase_admin
from firebase_admin import credentials, firestore

# --- CONFIGURAZIONE ---
# 1. Sostituisci con il percorso del tuo file JSON delle credenziali
SERVICE_ACCOUNT_KEY_PATH = "PERCORSO/DEL/TUO/file-chiave.json"

# 2. (Opzionale) Puoi specificare qui il tuo Project ID, altrimenti verrà letto dal file JSON
# PROJECT_ID = "il-tuo-project-id"
# --------------------


def delete_collection(coll_ref, batch_size):
    """
    Elimina tutti i documenti in una collezione in batch per efficienza.
    """
    docs = coll_ref.limit(batch_size).stream()
    deleted = 0

    while True:
        # Crea un batch per eliminare i documenti
        batch = db.batch()
        doc_count_in_batch = 0
        
        for doc in docs:
            batch.delete(doc.reference)
            doc_count_in_batch += 1
        
        # Se non ci sono più documenti da eliminare, esci dal ciclo
        if doc_count_in_batch == 0:
            break

        # Esegui l'eliminazione
        batch.commit()
        deleted += doc_count_in_batch
        print(f"  -> Eliminati {deleted} documenti...")

        # Prepara il batch successivo
        docs = coll_ref.limit(batch_size).stream()

    if deleted > 0:
        print(f"Completato: eliminati un totale di {deleted} documenti dalla collezione '{coll_ref.id}'.")
    else:
        print(f"La collezione '{coll_ref.id}' era già vuota.")

def main():
    """
    Funzione principale che inizializza Firebase e avvia il processo di pulizia.
    """
    print("🚀 Inizializzazione script di pulizia Firestore...")
    
    # Inizializza l'SDK di Firebase Admin
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        # Se hai specificato il project ID:
        # firebase_admin.initialize_app(cred, {'projectId': PROJECT_ID})
    except Exception as e:
        print(f"❌ ERRORE: Impossibile inizializzare Firebase. Controlla il percorso del file delle credenziali.")
        print(e)
        return

    global db
    db = firestore.client()
    
    print("✅ Connessione a Firestore stabilita.")
    
    # Ottieni la lista di tutte le collezioni principali
    collections = db.collections()
    
    for collection in collections:
        collection_id = collection.id
        print(f"\nAnalizzando la collezione: '{collection_id}'")
        
        # --- LA LOGICA PRINCIPALE ---
        # Se il nome della collezione è 'users', la saltiamo
        if collection_id == 'users':
            print("  -> 🟡 Collezione 'users' saltata come da istruzioni.")
            continue
        
        # Per tutte le altre collezioni, procediamo con l'eliminazione
        print(f"  -> 🔴 INIZIO ELIMINAZIONE per la collezione '{collection_id}'...")
        delete_collection(collection, batch_size=500) # Il batch size può essere al massimo 500

    print("\n🎉 Processo di pulizia completato.")


if __name__ == "__main__":
    main()