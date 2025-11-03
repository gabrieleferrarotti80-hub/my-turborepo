// File: GestionePermessiView.jsx
import React, { useState, useMemo } from 'react';
import { useFirebaseData, useCompaniesManager, ALL_FEATURES } from 'shared-core';
import { FeatureToggle } from 'shared-ui';

export const GestionePermessiView = () => {
    // ✅ MODIFICA: Leggi 'data' dal context
    const { data, loadingData } = useFirebaseData();
    // ✅ Estrai 'companies' da 'data' con optional chaining
    const companies = data?.companies;
    console.log('[GestionePermessiView] Oggetto data ricevuto:', data);
    console.log('[GestionePermessiView] Aziende estratte:', companies);

    const { updateCompanyFeatures } = useCompaniesManager();
    const [selectedCompanyId, setSelectedCompanyId] = useState('');

    // Calcola l'azienda selezionata (usa optional chaining)
    const selectedCompany = useMemo(() => {
        return companies?.find(c => c.id === selectedCompanyId);
    }, [companies, selectedCompanyId]);

    // Handler per cambiare una feature
    const handleFeatureChange = (featureId, isEnabled) => {
        if (!selectedCompany) return;
        const currentFeatures = selectedCompany.enabledFeatures || {};
        const newFeatures = { ...currentFeatures, [featureId]: isEnabled };
        updateCompanyFeatures(selectedCompanyId, newFeatures);
    };

    // Handler per abilitare tutto
    const handleEnableAll = () => {
        if (!selectedCompanyId) {
            console.warn("Nessuna azienda selezionata.");
            return;
        }
        const allFeaturesEnabled = ALL_FEATURES.reduce((acc, feature) => {
            acc[feature.id] = true;
            return acc;
        }, {});
        console.log(`[GestionePermessiView] Abilitando tutte le funzionalità per ${selectedCompanyId}:`, allFeaturesEnabled);
        updateCompanyFeatures(selectedCompanyId, allFeaturesEnabled);
    };

    // Stato di caricamento
    // ✅ Modificato leggermente per gestire il caso in cui 'companies' è definito ma vuoto
    if (loadingData && companies === undefined) {
        return <div className="p-8">Caricamento aziende...</div>;
    }

    // Render principale
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestione Permessi Funzionalità</h1>

            <div className="max-w-md mb-8">
                <label htmlFor="company-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Seleziona un'azienda per modificarne i permessi
                </label>
                <select
                    id="company-select"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="">-- Seleziona Azienda --</option>
                    {/* ✅ Mappa sull'array 'companies' estratto */}
                    {companies && companies.length > 0 ? (
                        [...companies] // Crea una copia per sortare in sicurezza
                            .sort((a, b) => (a.companyName || a.name || '').localeCompare(b.companyName || b.name || '')) // Usa companyName o name
                            .map(company => (
                                <option key={company.id} value={company.id}>
                                    {company.companyName || company.name || `Azienda ID: ${company.id}`} {/* Fallback se manca il nome */}
                                </option>
                            ))
                    ) : (
                         // Mostra messaggio se l'array è vuoto ma il caricamento è finito
                         !loadingData && <option disabled>Nessuna azienda trovata.</option>
                    )}
                     {/* Mostra messaggio se l'array non è definito e il caricamento è finito */}
                     {!companies && !loadingData && <option disabled>Errore caricamento aziende.</option>}
                </select>
            </div>

            {/* Sezione permessi per azienda selezionata */}
            {selectedCompany && (
                <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                        <h2 className="text-xl font-bold text-gray-800">
                            Permessi per: {selectedCompany.companyName || selectedCompany.name} {/* Usa companyName o name */}
                        </h2>
                        <button
                            onClick={handleEnableAll}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-md hover:bg-indigo-200"
                        >
                            Abilita Tutto
                        </button>
                    </div>
                    <div className="space-y-4 pt-2">
                        {ALL_FEATURES.map(feature => (
                            <FeatureToggle
                                key={feature.id}
                                feature={feature}
                                isEnabled={selectedCompany.enabledFeatures?.[feature.id] || false}
                                onChange={handleFeatureChange}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Se usi import { GestionePermessiView }, questo export è corretto.
// export default GestionePermessiView; // Rimuovi o commenta