// File: apps/app-esterna/src/components/ReportTecnicoScreen.jsx

import React, { useState, useEffect, useMemo } from 'react';
// ❌ Rimossi: CameraIcon, useFirebaseData, useReportSubmission

// ❌ Rimosso: NoteModal (non serve più qui)

export const ReportTecnicoScreen = ({ 
    // ❌ Rimossi: user
    userAziendaId, 
    cantieri, 
    onBack,
    forms,
    aziendeForm,
    onCompile // <-- ✅ NUOVA PROP (da TecnicoMask)
}) => {
    
    // ❌ Rimossi: db, storage, isNoteModalOpen, statusMessage
    // ❌ Rimosso: hook useReportSubmission

    const [selectedCantiere, setSelectedCantiere] = useState('');
    const [selectedFormId, setSelectedFormId] = useState(''); 

    // ✅ Logica di filtraggio (INVARIATA, con i log rimossi)
    const availableForms = useMemo(() => {
        if (!forms || !aziendeForm || !userAziendaId) {
            return [];
        }
        
        const permessiPerQuestaAzienda = aziendeForm.filter(permesso => 
            permesso.authorizedCompanyIds && 
            permesso.authorizedCompanyIds.includes(userAziendaId)
        );

        if (permessiPerQuestaAzienda.length === 0) {
            return [];
        }
        
        const idAmmessi = new Set(permessiPerQuestaAzienda.map(permesso => permesso.formId));
        const moduliFiltrati = forms.filter(form => idAmmessi.has(form.id));
        
        return moduliFiltrati;
    }, [forms, aziendeForm, userAziendaId]);


    // useEffect per selezionare il primo cantiere (INVARIATO)
    useEffect(() => {
        if (cantieri && cantieri.length > 0) {
            if (!cantieri.find(c => c.id === selectedCantiere)) {
                setSelectedCantiere(cantieri[0].id);
            }
        } else {
            setSelectedCantiere('');
        }
    }, [cantieri, selectedCantiere]);

    // useEffect per selezionare il primo modulo disponibile (INVARIATO)
    useEffect(() => {
        if (availableForms.length > 0 && !selectedFormId) {
            setSelectedFormId(availableForms[0].id);
        }
        if (availableForms.length === 0) {
            setSelectedFormId('');
        }
    }, [availableForms, selectedFormId]);


    const handleCantiereChange = (e) => {
        setSelectedCantiere(e.target.value);
    };

    const handleFormChange = (e) => {
        setSelectedFormId(e.target.value);
    };

    // --- ✅ NUOVO Handler per il pulsante "Avanti" ---
    const handleStartCompilation = () => {
        if (selectedFormId && selectedCantiere && typeof onCompile === 'function') {
            // Chiama la funzione del genitore (TecnicoMask)
            // Passa (formId, offertaId, cantiereId)
            onCompile(selectedFormId, null, selectedCantiere);
        } else {
            alert("Seleziona cantiere e modulo.");
        }
    };
    
    // ❌ Rimossi: handleCaptureAndNote, handleFinalSubmission

    return (
        <div className="p-6">
            <button onClick={onBack} className="mb-4 bg-gray-500 text-white font-bold py-2 px-4 rounded">
                Torna Indietro
            </button>
            <h2 className="text-2xl font-bold mb-4">Nuovo Rapporto Tecnico</h2>
            
            {/* Selettore Cantiere (INVARIATO) */}
            <div className="mb-4">
                <label htmlFor="cantiere-select" className="block text-sm font-medium">Seleziona Cantiere:</label>
                <select
                    id="cantiere-select"
                    className="mt-1 block w-full rounded-md"
                    value={selectedCantiere}
                    onChange={handleCantiereChange}
                    disabled={!cantieri || cantieri.length === 0} 
                >
                    {(!cantieri || cantieri.length === 0) && (
                        <option value="">Nessun cantiere disponibile</option>
                    )}
                    {(cantieri || []).map((cantiere) => (
                        <option key={cantiere.id} value={cantiere.id}>
                            {cantiere.nomeCantiere}
                        </option>
                    ))}
                </select>
            </div>

            {/* Selettore Moduli (INVARIATO) */}
            <div className="mb-4">
                <label htmlFor="form-select" className="block text-sm font-medium">Seleziona Modulo Report:</label>
                <select
                    id="form-select"
                    className="mt-1 block w-full rounded-md"
                    value={selectedFormId}
                    onChange={handleFormChange}
                    disabled={availableForms.length === 0}
                >
                    {availableForms.length === 0 && (
                        <option value="">Nessun modulo disponibile</option>
                    )}
                    {availableForms.map((form) => (
                        <option key={form.id} value={form.id}>
                            {form.nome}
                        </option>
                    ))}
                </select>
            </div>
            
            {/* --- ✅ PULSANTE MODIFICATO --- */}
            <div className="flex justify-center my-8">
                <button
                    onClick={handleStartCompilation} 
                    className="flex items-center space-x-2 bg-green-600 text-white font-bold py-4 px-8 rounded-full disabled:bg-gray-400"
                    disabled={!selectedCantiere || !selectedFormId}
                >
                    {/* ❌ Rimossa CameraIcon */}
                    <span>Compila Modulo</span>
                </button>
            </div>
            
            {/* ❌ Rimossi: statusMessage e NoteModal */}
        </div>
    );
};