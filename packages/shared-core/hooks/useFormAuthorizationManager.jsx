import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';

export const useFormAuthorizationManager = (db) => {
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Crea o aggiorna il documento di autorizzazione per un dato form.
     * @param {string} formId - L'ID del modulo a cui si riferiscono le autorizzazioni.
     * @param {string[]} selectedCompanyIds - Un array di ID delle aziende selezionate.
     * @returns {{success: boolean, message: string}} Esito dell'operazione.
     */
    const updateAuthorizations = async (formId, selectedCompanyIds) => {
        if (!formId) {
            return { success: false, message: "ID del modulo non fornito." };
        }
        
        setIsSaving(true);
        try {
            const authDocRef = doc(db, 'aziendeForm', formId);
            
            const dataToSave = { 
                formId: formId,
                authorizedCompanyIds: selectedCompanyIds || []
            };

            await setDoc(authDocRef, dataToSave);
            
            return { success: true, message: "Autorizzazioni salvate con successo!" };

        } catch (error) {
            console.error("Errore nel salvataggio delle autorizzazioni:", error);
            return { success: false, message: "Si è verificato un errore durante il salvataggio." };
        } finally {
            setIsSaving(false);
        }
    };

    return { updateAuthorizations, isSaving };
};