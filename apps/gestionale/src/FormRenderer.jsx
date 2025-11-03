import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { useTheme } from './ThemeCustomizer.jsx';
import { useRapportiniManager } from 'shared-core';
import { ArrowLeftIcon, DocumentPlusIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

export const FormRenderer = ({ onBack, cantiereId }) => {
    // 1. Recupera 'db' e 'userAziendaId' dal contesto
    const { db, userAziendaId } = useFirebaseData();
    const { primaryColor, colorClasses } = useTheme();

    // 2. "Inietta" 'db' nell'hook condiviso
    const { templates, isLoadingTemplates, saveRapportino, isSaving, error } = useRapportiniManager(db);

    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [formData, setFormData] = useState({});
    const [message, setMessage] = useState('');

    // ❌ RIMOSSO: L'useEffect per caricare i template è stato spostato nell'hook

    const handleSelectTemplate = (template) => {
        // ... (logica invariata)
    };

    const handleInputChange = (question, value) => {
        // ... (logica invariata)
    };

    // ✅ 3. La funzione di salvataggio ora delega il lavoro all'hook
    const handleSaveRapportino = async () => {
        setMessage('');
        const rapportinoData = {
            cantiereId: cantiereId,
            templateId: selectedTemplate.id,
            templateTitle: selectedTemplate.title,
            aziendaId: userAziendaId,
            compilazione: formData
        };
        
        const result = await saveRapportino(rapportinoData);
        setMessage(result.message);

        if (result.success) {
            setFormData({});
            setSelectedTemplate(null);
        }
    };

    // Vista di caricamento
    if (isLoadingTemplates) {
        return <div className="text-center p-8">Caricamento modelli...</div>;
    }

    // Vista di selezione del modello
    if (!selectedTemplate) {
        return (
            <div className="space-y-6 animate-fade-in p-6 bg-white rounded-lg shadow-md">
                {/* ... (JSX della vista di selezione invariato) ... */}
            </div>
        );
    }

    // Vista di compilazione del modulo
    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-lg shadow-md">
            {/* ... (JSX della vista di compilazione, ora usa 'isSaving' dall'hook) ... */}
        </div>
    );
};

