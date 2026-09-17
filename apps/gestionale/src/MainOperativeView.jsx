import React, { useState, useEffect, useMemo } from 'react';
import { CubeIcon, DocumentTextIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { faFileEdit, faHome, faHardHat } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useFirebaseData, getPermissionsByRole, useFormManager, useRapportiniManager } from 'shared-core';
import { OperativeSidebar } from './OperativeSidebar.jsx';
import { CantiereDashboard } from './CantiereDashboard.jsx';
import { AssegnazioniContent } from './AssegnazioniContent.jsx';
import { ReportDashboard } from './components/ReportDashboard.jsx';
import { CantiereReportDashboard } from './CantiereReportDashboard.jsx';
import { FormList, FormReader } from 'shared-ui';
import { AssegnaCantiereForm } from './AssegnaCantiereForm.jsx'; 

// ✅ IMPORTA IL NUOVO COMPONENTE SICUREZZA
import { SicurezzaContent } from './components/sicurezza/SicurezzaContent.jsx';

// Definiamo qui la struttura della sidebar.
const operativeViewsConfig = [
    { id: 'menu', label: 'Menu Principale', icon: faHome },
    { id: 'cantieri', label: 'Cantieri', icon: faHardHat },
    { id: 'assegnazioni', label: 'Assegnazioni', icon: CubeIcon, permission: 'canViewAssegnazioni' },
    // ✅ NUOVA VOCE MENU
    { id: 'sicurezza', label: 'Sicurezza & DPI', icon: ShieldCheckIcon }, 
    { id: 'moduli-operativi', label: 'Moduli Operativi', icon: faFileEdit, permission: 'canReadForms' },
];

export const MainOperativeView = ({ onBack }) => {
    
    // --- STATI ---
    const [currentView, setCurrentView] = useState('menu');
    const [selectedFormId, setSelectedFormId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [formData, setFormData] = useState({});
    const [formElements, setFormElements] = useState([]);
    const [formError, setFormError] = useState('');

    // --- HOOKS ---
    const { db, user, userAziendaId, userRole, companyFeatures, data, loadingData } = useFirebaseData();

    const permissions = getPermissionsByRole(userRole);
    const { getFormStructure, isLoading: loadingFormStructure } = useFormManager(db);
    const { saveRapportino, isSaving: isSavingRapportino } = useRapportiniManager(db, user, userAziendaId);

    // Filtra le viste della sidebar in base ai permessi dell'utente
    const availableViews = operativeViewsConfig.filter(view => !view.permission || permissions[view.permission]);

    // Logica di filtraggio per i moduli
    const availableForms = useMemo(() => {
        if (loadingData || !data?.forms || !data?.aziendeForm || !userAziendaId) {
            return [];
        }
        const allForms = data.forms;
        const allAziendaForms = data.aziendeForm;
        const authorizedFormDocs = allAziendaForms.filter(authDoc =>
            Array.isArray(authDoc.authorizedCompanyIds) && authDoc.authorizedCompanyIds.includes(userAziendaId)
        );
        const authorizedFormIds = new Set(authorizedFormDocs.map(doc => doc.formId).filter(id => !!id));
        if (authorizedFormIds.size === 0) {
            return [];
        }
        return allForms.filter(form => authorizedFormIds.has(form.id));
    }, [data?.forms, data?.aziendeForm, userAziendaId, loadingData]);

    // Effetto per caricare la struttura del form
    useEffect(() => {
        const fetchForm = async () => {
            if (currentView !== 'formReader' || !selectedFormId) return;
            setFormError('');
            const result = await getFormStructure(selectedFormId);
            if (result.success && result.data?.formStructure) {
                const elements = Object.values(result.data.formStructure).sort((a, b) => a.y - b.y || a.x - b.x);
                setFormElements(elements);
                const initialData = {};
                elements.forEach(el => { if (el.id && el.type !== 'static-text') initialData[el.id] = ''; });
                setFormData(initialData);
            } else {
                setFormError(result.message || 'Modulo non trovato o non valido.');
            }
        };
        fetchForm();
    }, [currentView, selectedFormId, getFormStructure]);

    // --- HANDLERS ---
    const handleNavigate = (view, id = null) => {
        setCurrentView(view);
        setSelectedFormId(id);
    };
    const handleSaveSuccess = (message) => { /* ... */ };
    const handleInputChange = (e) => { /* ... */ };
    const handleSubmitRapportino = async (e) => { /* ... */ };

    // --- LOGICA DI RENDER ---
    const renderContent = () => {
        switch (currentView) {
            case 'cantieri':
                return <CantiereDashboard />;
            
            case 'assegnazioni':
                return <AssegnazioniContent 
                            onNavigate={handleNavigate} 
                            data={data} 
                            loadingData={loadingData}
                            db={db}
                            user={user}
                            userAziendaId={userAziendaId}
                            userRole={userRole} 
                        />;

            case 'report-individuali':
                return <ReportDashboard 
                            data={data} 
                            loadingData={loadingData} 
                        />;
           
            case 'report-cantiere':
                return <CantiereReportDashboard 
                            data={data}
                            loadingData={loadingData}
                            userRole={userRole}
                            companyFeatures={companyFeatures}
                       />;
            
            // ✅ CASE PER RENDERIZZARE LA VISTA SICUREZZA
            case 'sicurezza':
                return <SicurezzaContent />;

            case 'moduli-operativi':
                return <FormList 
                            forms={availableForms} 
                            loading={loadingData} 
                            error={!loadingData && availableForms.length === 0 ? "Nessun modulo autorizzato per la tua azienda." : null}
                            onSelectForm={(id) => handleNavigate('formReader', id)} 
                        />;
            
            case 'formReader':
                return (
                    <FormReader 
                        formElements={formElements}
                        formData={formData}
                        loading={loadingFormStructure || isSavingRapportino}
                        error={formError}
                        onInputChange={handleInputChange}
                        onSubmit={handleSubmitRapportino}
                        onBack={() => handleNavigate('menu')}
                    />
                );
            case 'menu':
            default:
                if (loadingData) {
                    return (
                        <div className="flex justify-center items-center h-48">
                            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-gray-500" />
                        </div>
                    );
                }
                const getCardStyle = (isEnabled) => `flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-xl transition-transform transform ${isEnabled ? 'hover:scale-105 hover:shadow-2xl' : 'cursor-not-allowed opacity-50'} animate-fade-in`;
                const getButtonClass = (isEnabled) => `w-full text-center font-semibold mt-4 py-2 px-4 rounded-xl transition-colors ${isEnabled ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-500'}`;
                
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-gray-800">Gestione Operativa</h1>
                        <p className="text-gray-600">Gestisci gli aspetti chiave delle operazioni della tua azienda.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {permissions.canViewAssegnazioni && (
                                <div className={getCardStyle(true)}>
                                    <CubeIcon className="w-16 h-16 text-indigo-500 mb-4" />
                                    <h2 className="text-xl font-semibold">Assegnazioni</h2>
                                    <p className="text-gray-500 text-center text-sm mt-2">Assegna personale e attrezzature ai cantieri.</p>
                                    <button onClick={() => handleNavigate('assegnazioni')} className={getButtonClass(true)}>Vai ad Assegnazioni</button>
                                </div>
                            )}

                            {/* ✅ CARD PER LA SICUREZZA */}
                            <div className={getCardStyle(true)}>
                                <ShieldCheckIcon className="w-16 h-16 text-emerald-600 mb-4" />
                                <h2 className="text-xl font-semibold">Sicurezza & DPI</h2>
                                <p className="text-gray-500 text-center text-sm mt-2">Gestione POS, Verbali DPI e Scadenze.</p>
                                <button onClick={() => handleNavigate('sicurezza')} className={getButtonClass(true).replace('bg-indigo-600', 'bg-emerald-600').replace('hover:bg-indigo-700', 'hover:bg-emerald-700')}>
                                    Vai a Sicurezza
                                </button>
                            </div>

                            {permissions.canViewReports && (
                                <div className={getCardStyle(true)}>
                                    <DocumentTextIcon className="w-16 h-16 text-indigo-500 mb-4" />
                                    <h2 className="text-xl font-semibold">Report Individuali</h2>
                                    <p className="text-gray-500 text-center text-sm mt-2">Consulta i report inviati dalle squadre sul campo.</p>
                                    <button onClick={() => handleNavigate('report-individuali')} className={getButtonClass(true)}>Vai a Report</button>
                                </div>
                            )}

                            {permissions.canViewCantiereReports && (
                                <div className={getCardStyle(true)}>
                                    <ChartBarIcon className="w-16 h-16 text-indigo-500 mb-4" />
                                    <h2 className="text-xl font-semibold">Report Cantieri</h2>
                                    <p className="text-gray-500 text-center text-sm mt-2">Analisi complete su giornate e personale dei cantieri.</p>
                                    <button onClick={() => handleNavigate('report-cantiere')} className={getButtonClass(true)}>Visualizza Report</button>
                                </div>
                            )}

                            {permissions.canReadForms && (
                                <div className={getCardStyle(true)}>
                                    <FontAwesomeIcon icon={faFileEdit} className="w-16 h-16 text-indigo-500 mb-4" />
                                    <h2 className="text-xl font-semibold">Compila Modulo</h2>
                                    <p className="text-gray-500 text-center text-sm mt-2">Compila un modulo personalizzato basato sui modelli.</p>
                                    <button onClick={() => handleNavigate('moduli-operativi')} className={getButtonClass(true)}>Compila un Modulo</button>
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex w-full h-full">
            <OperativeSidebar
                activeView={currentView}
                onNavigate={handleNavigate}
                onBack={onBack}
                views={availableViews}
            />
            <div className="flex-1 overflow-y-auto p-8">
                {successMessage && <div className="bg-green-100 text-green-700 p-4 rounded-md mb-4">{successMessage}</div>}
                {renderContent()}
            </div>
        </div>
    );
};