import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebaseData } from 'shared-core';
import { reportSchema, formatForFirestore } from 'shared-core'; 

export const FormRenderer = ({ user, companyID, selectedCantiereId, selectedPrepostoId, availableTemplates }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const { db } = useFirebaseData();

    const handleSelectTemplate = (templateId) => {
        const template = availableTemplates.find(t => t.id === templateId);
        setSelectedTemplate(template);
        setFormData({}); // Resetta i dati del form quando si cambia template
    };

    const handleInputChange = (questionId, value) => {
        setFormData(prevData => ({
            ...prevData,
            [questionId]: value
        }));
    };

    const handleSaveForm = async () => {
        if (!selectedTemplate) {
            setMessage("Nessun template selezionato.");
            return;
        }

        setIsSaving(true);
        setMessage('');
        try {
            const reportDataGrezzi = {
                cantiereId: selectedCantiereId,
                tecnicoId: user.uid,
                companyID: companyID,
                dataReport: serverTimestamp(),
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.nome || 'Senza Titolo',
                formData: formData, 
                tecnicoEmail: user.email,
            };
            
            const finalPayload = formatForFirestore(reportDataGrezzi, reportSchema);

            await addDoc(collection(db, 'reportTecnico'), finalPayload); // Collezione corretta

            setMessage('Rapportino salvato con successo!');
            // Resetta lo stato dopo il salvataggio
            setFormData({});
            setSelectedTemplate(null);
        } catch (error) {
            console.error("Errore nel salvataggio del rapportino:", error);
            setMessage("Errore nel salvataggio.");
        } finally {
            setIsSaving(false);
        }
    };
    
    // Funzione per renderizzare i campi del form in base alla loro tipologia
    const renderFormField = (fieldId, fieldData) => {
        switch (fieldData.type) {
            case 'text':
            case 'number':
            case 'date':
                return (
                    <div key={fieldId} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{fieldData.label}</label>
                        <input
                            type={fieldData.type}
                            value={formData[fieldId] || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                );
            case 'textarea':
                return (
                    <div key={fieldId} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{fieldData.label}</label>
                        <textarea
                            value={formData[fieldId] || ''}
                            onChange={(e) => handleInputChange(fieldId, e.target.value)}
                            rows="4"
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                );
            case 'static-text':
                 return <h3 key={fieldId} className="text-xl font-bold text-gray-800 my-4">{fieldData.content}</h3>;
            default:
                return <p key={fieldId}>Campo non supportato: {fieldData.type}</p>;
        }
    };

    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            {!selectedTemplate ? (
                // --- VISTA SELEZIONE TEMPLATE ---
                <div>
                    <label htmlFor="template-select" className="block text-sm font-medium text-gray-700">Seleziona un Template di Rapporto:</label>
                    <select
                        id="template-select"
                        onChange={(e) => handleSelectTemplate(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        defaultValue=""
                    >
                        <option value="" disabled>Scegli un'opzione...</option>
                        {(availableTemplates || []).map(template => (
                            <option key={template.id} value={template.id}>
                                {template.nome || 'Template senza nome'}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                // --- VISTA COMPILAZIONE FORM ---
                <div>
                    <button onClick={() => setSelectedTemplate(null)} className="text-sm text-blue-600 hover:underline mb-4">
                        &larr; Cambia Template
                    </button>
                    {/* Renderizza dinamicamente i campi del form */}
                    {Object.entries(selectedTemplate.formStructure).sort(([,a],[,b]) => a.order - b.order).map(([fieldId, fieldData]) =>
                        renderFormField(fieldId, fieldData)
                    )}

                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleSaveForm}
                            disabled={isSaving}
                            className="py-3 px-6 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700"
                        >
                            {isSaving ? 'Salvataggio...' : 'Salva Rapportino'}
                        </button>
                    </div>
                </div>
            )}
            {message && <p className="text-center mt-4">{message}</p>}
        </div>
    );
};

export default FormRenderer;