// Percorso: packages/shared-ui/forms/ModificaArticoloForm.jsx (REFACTORING FINALE)

import React, { useState, useEffect } from 'react';
// ✅ Importa le utilities statiche necessarie da shared-core/data/
// (Assumendo che tu voglia mantenere 'parseAttrezzatura' e 'attrezzaturaSchema' in shared-core)
import { attrezzaturaSchema, parseAttrezzatura } from 'shared-core'; 
import { ArrowLeftIcon } from '@heroicons/react/24/solid'; // Icona per onBack

// ❌ RIMOSSI: useAttrezzaturaManager, useFirebaseData, ActionButtons.jsx
// La logica di business è ora fornita tramite props.
 
// ✅ Accetta le funzioni e gli stati di business come props.
export const ModificaArticoloForm = ({ 
    initialData, 
    onBack, 
    onSaveSuccess, // Nuova prop per notificare successo
    updateArticolo, // Funzione manager da useArticoliManager
    isLoading, 
    message, 
    isError 
}) => {
    // ❌ RIMOSSE: Tutte le chiamate agli hook manager interni e al contesto.
    // const { db } = useFirebaseData();
    // const { updateAttrezzatura, isLoading, message, isError } = useAttrezzaturaManager(db);

    // Variabili statiche di colore (Poiché useTheme è stato rimosso correttamente)
    const FOCUS_CLASS = 'focus:ring-indigo-500 focus:border-indigo-500';
    const BUTTON_CLASS = 'bg-indigo-600 hover:bg-indigo-700';

    const getInitialFormData = () => {
        // Applica il parser se il dato in ingresso è presente
        return initialData ? parseAttrezzatura(initialData) : { ...attrezzaturaSchema };
    };

    const [formData, setFormData] = useState(getInitialFormData());

    // Effetto per aggiornare il form se i dati iniziali cambiano (ad esempio, al cambio di articolo)
    useEffect(() => {
        setFormData(getInitialFormData());
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // La validazione deve essere gestita O qui (tramite validatori importati)
        // O all'interno di updateArticolo, che è l'approccio che stai seguendo.

        // ✅ Chiama la funzione di aggiornamento ricevuta come prop
        const result = await updateArticolo(initialData.id, formData);
        
        // Si presume che updateArticolo ritorni {success: boolean, message: string}
        if (result.success) {
            onSaveSuccess(result.message); // Notifica il contenitore del successo
        }
    };
    
    // Si presume che 'initialData' abbia 'nome' al posto di 'Marca' e 'Modello'
    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-lg mx-auto animate-fade-in">
             <button onClick={onBack} className={`flex items-center gap-2 text-indigo-600 mb-4 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna all'Inventario
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Modifica Articolo: {initialData.nome}
            </h2>
            
            {/* ✅ Usa le props 'message' e 'isError' per visualizzare lo stato */}
            {message && (
                <div className={`p-3 mb-4 rounded-lg text-sm ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Esempio di un campo di input (Assumo che 'nome' sia il campo corretto) */}
                <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome Articolo</label>
                    <input 
                        type="text" 
                        id="nome"
                        name="nome"
                        value={formData.nome || ''} 
                        onChange={handleChange} 
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${FOCUS_CLASS}`}
                        required
                    />
                </div>

                {/* I campi di input devono essere aggiornati per riflettere lo schema corretto (nome, seriale, categoria, dettagli) */}
                {/* Esempio corretto per Modello e Marca (se fanno parte di 'dettagli' nello schema) */}
                 <div>
                    <label htmlFor="Modello" className="block text-sm font-medium text-gray-700">Modello</label>
                    <input 
                        type="text" 
                        id="Modello"
                        name="dettagli.modello" // Usare name='dettagli.modello' se gestisci nested state
                        value={formData.dettagli?.modello || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, dettagli: { ...prev.dettagli, modello: e.target.value } }))}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${FOCUS_CLASS}`}
                    />
                </div>
                
                {/* ... (altri campi del form) ... */}


                <div className="flex justify-end gap-3 pt-4">
                    <button 
                        type="button" 
                        onClick={onBack} 
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        // ✅ Usa la prop isLoading
                        disabled={isLoading}
                    >
                        Annulla
                    </button>
                    <button 
                        type="submit" 
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${BUTTON_CLASS} transition-colors disabled:bg-gray-400`}
                        // ✅ Usa la prop isLoading
                        disabled={isLoading}
                    >
                        {isLoading ? 'Salvataggio...' : 'Salva Modifiche'}
                    </button>
                </div>
            </form>
        </div>
    );
};