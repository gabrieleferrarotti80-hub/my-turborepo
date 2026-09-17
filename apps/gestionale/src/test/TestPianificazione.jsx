// src/test/TestPianificazione.jsx

import React from 'react';
// Sostituisci con il percorso corretto se necessario
import { PianificazioneOperativaView } from 'shared-ui/views/PianificazioneOperativaView';

const mockOffertaConComputo = {
    id: "test_offerta_002",
    nomeOfferta: "Cantiere Test: Manutenzione Straordinaria Parco e Viali",
    stato: "in_elaborazione",
    datiAnalisi: {
        valoreEconomico: 24500,
        computoMetrico: [
            // --- GRUPPO TAGLIO ERBA ---
            { id: "r_1", codiceArticolo: "VRD-001", descrizione: "Taglio erba prato centrale con trattorino (circa 1500mq).", quantita: 1, prezzo: 150.00, prezzoTotale: 150.00, orePreviste: 4 },
            { id: "r_2", codiceArticolo: "VRD-002", descrizione: "Taglio erba aiuole perimetrali con decespugliatore e rifinitura bordi (300mq).", quantita: 1, prezzo: 200.00, prezzoTotale: 200.00, orePreviste: 6 },
            { id: "r_3", codiceArticolo: "VRD-003", descrizione: "Sfregatura e taglio erba su scarpata stradale pendenza > 30% (800mq).", quantita: 1, prezzo: 450.00, prezzoTotale: 450.00, orePreviste: 12 },
            
            // --- GRUPPO POTATURE ---
            { id: "r_4", codiceArticolo: "POT-001", descrizione: "Potatura siepe di alloro perimetrale h=2m (120ml).", quantita: 120, prezzo: 4.50, prezzoTotale: 540.00, orePreviste: 16 },
            { id: "r_5", codiceArticolo: "POT-002", descrizione: "Potatura di contenimento alberi ad alto fusto con cestello (15 pz).", quantita: 15, prezzo: 180.00, prezzoTotale: 2700.00, orePreviste: 40 },
            { id: "r_6", codiceArticolo: "POT-003", descrizione: "Rimonda del secco e messa in sicurezza Pini Marittimi (5 pz).", quantita: 5, prezzo: 250.00, prezzoTotale: 1250.00, orePreviste: 16 },
            
            // --- GRUPPO PULIZIA E SMALTIMENTO ---
            { id: "r_7", codiceArticolo: "PUL-001", descrizione: "Raccolta, triturazione in loco e smaltimento frasche e risulta a discarica autorizzata.", quantita: 1, prezzo: 800.00, prezzoTotale: 800.00, orePreviste: 10 },
            { id: "r_8", codiceArticolo: "PUL-002", descrizione: "Pulizia finale viali e piazzali pedonali con soffiatore e spazzatrice.", quantita: 1, prezzo: 150.00, prezzoTotale: 150.00, orePreviste: 4 },
            
            // --- GRUPPO IMPIANTI / EDILIZIA ---
            { id: "r_9", codiceArticolo: "EDIL-01", descrizione: "Sistemazione cordolo in tufo ammalorato zona ingresso (circa 10ml).", quantita: 10, prezzo: 35.00, prezzoTotale: 350.00, orePreviste: 8 },
            { id: "r_10", codiceArticolo: "IMP-01", descrizione: "Ricerca guasto e riparazione linea irrigazione zona aiuole nord (sostituzione 3 irrigatori).", quantita: 1, prezzo: 250.00, prezzoTotale: 250.00, orePreviste: 6 },
            { id: "r_11", codiceArticolo: "EDIL-02", descrizione: "Ripristino intonaco muretto di recinzione e tinteggiatura (25mq).", quantita: 25, prezzo: 45.00, prezzoTotale: 1125.00, orePreviste: 16 },
            
            // --- EXTRA ALLESTIMENTO ---
            { id: "r_12", codiceArticolo: "SIC-01", descrizione: "Allestimento cantiere e segnaletica stradale temporanea.", quantita: 1, prezzo: 300.00, prezzoTotale: 300.00, orePreviste: 4 }
        ]
    }
};

export const TestPianificazione = () => {
    return (
        <div className="h-screen w-screen bg-slate-100 flex overflow-hidden">
            <PianificazioneOperativaView 
                offerta={mockOffertaConComputo} 
                onBack={() => alert("Test: Torna indietro cliccato")}
                onGoToGantt={() => alert("Test: Vai al Gantt cliccato. I pacchetti sono pronti!")}
            />
        </div>
    );
};
