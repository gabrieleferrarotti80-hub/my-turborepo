import React, { useState, useEffect } from 'react';
import { CubeIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
// ✅ AGGIUNTO: Importa l'hook manager corretto
import { useFirebaseData, getPermissionsByRole, useFormManager } from 'shared-core'; 
import { faFileEdit, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FormReader from './FormReader.jsx';
// ❌ RIMOSSO: L'import di 'getDoc' non è più necessario qui.
// import { doc, getDoc } from 'firebase/firestore';

export const GestioneOperativaView = ({ onNavigate, activeView }) => {
    // --- 1. GESTIONE DATI E PERMESSI (INVARIATO) ---
    const { db, userRole, loadingData } = useFirebaseData();
    const permissions = getPermissionsByRole(userRole);
    const { canViewAssegnazioni, canManageRapportini, canReadForms, canViewReports } = permissions;

    // ✅ AGGIUNTO: Inizializza l'hook per le azioni sui form.
    // Usiamo l'aliasing per rinominare 'isLoading' in 'loadingForm' ed evitare conflitti.
    const { getFormStructure, isLoading: loadingForm } = useFormManager(db);

    // --- 2. GESTIONE STATO PER FORMREADER ---
    const [formElements, setFormElements] = useState([]);
    const [formData, setFormData] = useState({});
    // ❌ RIMOSSO: Lo stato di caricamento 'loadingForm' ora viene dall'hook.
    // const [loadingForm, setLoadingForm] = useState(true);
    const [formError, setFormError] = useState('');

    // ✅ CORRETTO: L'useEffect ora delega la logica di fetching all'hook, rendendo il codice più pulito e dichiarativo.
    useEffect(() => {
        const fetchFormStructure = async () => {
            if (activeView !== 'formReader') return;

            setFormError('');
            // La logica di caricamento e gestione errori è ora incapsulata nell'hook.
            const result = await getFormStructure('formProva'); // ID hardcoded come prima

            if (result.success && result.data) {
                const formStructureData = result.data;
                if (formStructureData?.formStructure) {
                    const elementsArray = Object.values(formStructureData.formStructure).sort((a, b) => a.y - b.y || a.x - b.x);
                    setFormElements(elementsArray);
                    
                    const initialData = {};
                    elementsArray.forEach(element => {
                        if (element.id && element.type !== 'static-text') {
                            initialData[element.id] = '';
                        }
                    });
                    setFormData(initialData);
                } else {
                    setFormError('Il modulo trovato non ha una struttura valida.');
                }
            } else {
                setFormError(result.message || 'Errore nel recupero del modulo.');
            }
        };

        fetchFormStructure();
    }, [activeView, getFormStructure]); // 'getFormStructure' è ora una dipendenza stabile dell'hook

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Dati da inviare:", formData);
        alert("Logica di salvataggio da implementare qui, delegando a un hook come 'useFormSubmissionManager'.");
    };

    // --- 3. LOGICA DI RENDER (INVARIATA) ---
    // Il JSX rimane identico, ma ora è alimentato da una logica più pulita.
    
    if (loadingData) {
        return (
            <div className="flex justify-center items-center h-48">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-gray-500" />
            </div>
        );
    }

    if (activeView === 'formReader') {
        return (
            <FormReader 
                formElements={formElements}
                formData={formData}
                loading={loadingForm} // Lo stato di caricamento ora arriva direttamente dall'hook
                error={formError}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
            />
        );
    }

    const getCardStyle = (isEnabled) =>
        `flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-xl transition-transform transform ${isEnabled ? 'hover:scale-105 hover:shadow-2xl' : 'cursor-not-allowed opacity-50'} animate-fade-in`;

    const getButtonClass = (isEnabled) =>
        `w-full text-center font-semibold mt-4 py-2 px-4 rounded-xl transition-colors ${isEnabled ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-500'}`;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Gestione Operativa</h1>
            <p className="text-gray-600">
                Gestisci gli aspetti chiave delle operazioni della tua azienda.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Card Assegnazioni */}
                <div className={getCardStyle(canViewAssegnazioni)}>
                    <CubeIcon className="w-16 h-16 text-indigo-500 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800">Assegnazioni</h2>
                    <p className="text-gray-500 text-center text-sm mt-2">
                        Gestisci le assegnazioni di personale e attrezzature ai cantieri.
                    </p>
                    <button
                        type="button"
                        onClick={() => onNavigate('assegnazioni')}
                        disabled={!canViewAssegnazioni}
                        className={getButtonClass(canViewAssegnazioni)}
                    >
                        Vai ad Assegnazioni
                    </button>
                </div>

                {/* Card Modelli Rapportini */}
                <div className={getCardStyle(canManageRapportini)}>
                    <DocumentTextIcon className="w-16 h-16 text-indigo-500 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800">Modelli Rapportini</h2>
                    <p className="text-gray-500 text-center text-sm mt-2">
                        Crea e gestisci modelli per i rapportini di cantiere.
                    </p>
                    <button
                        type="button"
                        onClick={() => onNavigate('rapportini')}
                        disabled={!canManageRapportini}
                        className={getButtonClass(canManageRapportini)}
                    >
                        Gestisci Modelli
                    </button>
                </div>

                {/* Card Report e Analisi */}
                {canViewReports && (
                    <div className={getCardStyle(true)}>
                        <DocumentTextIcon className="w-16 h-16 text-indigo-500 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800">Report e Analisi</h2>
                        <p className="text-gray-500 text-center text-sm mt-2">
                            Consulta i report dettagliati per analizzare i dati dei cantieri.
                        </p>
                        <button
                            type="button"
                            onClick={() => onNavigate('reports')}
                            className={getButtonClass(true)}
                        >
                            Vai a Report
                        </button>
                    </div>
                )}
                
                {/* Nuova Card - Compila Modulo */}
                <div className={getCardStyle(canReadForms)}>
                    <FontAwesomeIcon icon={faFileEdit} className="w-16 h-16 text-indigo-500 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800">Compila Modulo</h2>
                    <p className="text-gray-500 text-center text-sm mt-2">
                        Compila un modulo personalizzato basato sui modelli salvati.
                    </p>
                    <button
                        type="button"
                        onClick={() => onNavigate('formReader')} 
                        disabled={!canReadForms}
                        className={getButtonClass(canReadForms)}
                    >
                        Compila un Modulo
                    </button>
                </div>
            </div>
        </div>
    );
};