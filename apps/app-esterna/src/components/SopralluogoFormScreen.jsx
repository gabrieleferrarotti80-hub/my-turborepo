// apps/app-esterna/components/SopralluogoFormScreen.jsx
import React from 'react';
// ❌ Rimossi: useOfferteManager, useFirebaseData
import { useFormRenderer } from 'shared-core';
import { GenericFormRenderer } from 'shared-ui'; // Importa il renderer "stupido"
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export const SopralluogoFormScreen = ({ 
    // Props di Contesto (per compilazione automatica)
    formTemplateId, 
    offertaId, 
    cantiereId, 
    user,
    
    // Props di Controllo (dal genitore)
    onBack, 
    onSubmit, // <-- ✅ NUOVA PROP: La funzione di salvataggio del genitore
    isSaving, // <-- ✅ NUOVA PROP: Lo stato di caricamento del genitore
    error // <-- ✅ NUOVA PROP: Per mostrare errori dal genitore
}) => {
    
    // 1. Inizializza l'hook del renderer
    // ❌ Rimossi: useFirebaseData, useOfferteManager
    
    const { 
        templateStructure, 
        formData, 
        isLoadingTemplate, 
        isUploadingFiles, 
        handleChange, 
        handleFileUpload, 
        getFormData,
        error: formError
    } = useFormRenderer(formTemplateId, { 
        // Passiamo tutto il contesto all'hook del form
        // per permettere la compilazione automatica
        offertaId: offertaId,
        cantiereId: cantiereId,
        user: user 
    }); 
    
    // ❌ Rimossa: const { salvaSopralluogoReport, ... }

    // 2. Handler per il salvataggio (ora "stupido")
    const handleSubmit = async () => {
        if (isUploadingFiles) {
            alert("Attendi la fine del caricamento dei file.");
            return;
        }
        
        const finalData = getFormData(); // Ottiene i dati puliti (inclusi i link ai file)
        
        // Aggiungi logica di validazione (se necessaria)
        if (!finalData) {
            alert("Errore nel recuperare i dati del modulo.");
            return;
        }

        // ✅ MODIFICA: Chiama la funzione onSubmit passata dal genitore (TecnicoMask)
        if (typeof onSubmit === 'function') {
            onSubmit(finalData);
        } else {
            console.error("onSubmit prop non fornita a SopralluogoFormScreen");
        }
        
        // ❌ Rimossa la logica di salvataggio interna
    };

    // 3. Render
    // 'isLoading' ora combina il caricamento del template E lo stato 'isSaving' dal genitore
    const isLoading = isLoadingTemplate || isSaving;
    
    return (
        <div className="p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="text-gray-600 hover:text-gray-800">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                {/* Titolo dinamico in base al contesto */}
                <h2 className="text-xl font-bold text-gray-800">
                    {offertaId ? "Compila Sopralluogo" : "Compila Report"}
                </h2>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || isUploadingFiles}
                    className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 disabled:bg-gray-400"
                >
                    {isSaving ? "Salvo..." : "Salva Report"}
                </button>
            </div>

            {formError && <p className="text-red-600 text-center">{formError}</p>}
            {/* Mostra l'errore di salvataggio passato dal genitore */}
            {error && <p className="text-red-600 text-center">{error.message}</p>} 
            
            <GenericFormRenderer
                templateStructure={templateStructure}
                formData={formData}
                isLoading={isLoadingTemplate}
                isUploading={isUploadingFiles}
                onChange={handleChange}
                onFileUpload={handleFileUpload}
            />
        </div>
    );
};