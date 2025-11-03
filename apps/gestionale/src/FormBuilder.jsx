import React, { useState } from 'react';
import { useFirebaseData } from 'shared-core';
import { useFormManager } from 'shared-core';
import { useTheme } from './ThemeCustomizer.jsx';
import { PlusIcon, CheckIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

export const FormBuilder = ({ onBack }) => {
    // 1. Recupera 'db' dal contesto locale
    const { db, userAziendaId, loadingData } = useFirebaseData();
    const { primaryColor, colorClasses } = useTheme();

    // 2. "Inietta" 'db' nell'hook condiviso
    const { addFormTemplate, isSaving, error } = useFormManager(db);

    const [formTitle, setFormTitle] = useState('');
    const [sections, setSections] = useState([]);
    const [message, setMessage] = useState('');


    const addSection = () => {
        setSections([...sections, { title: '', fields: [] }]);
    };

    const handleSectionTitleChange = (index, newTitle) => {
        const newSections = [...sections];
        newSections[index].title = newTitle;
        setSections(newSections);
    };

    const addField = (sectionIndex) => {
        const newSections = [...sections];
        newSections[sectionIndex].fields.push({ question: '', type: 'si/no/na' });
        setSections(newSections);
    };

    const handleFieldChange = (sectionIndex, fieldIndex, key, value) => {
        const newSections = [...sections];
        newSections[sectionIndex].fields[fieldIndex][key] = value;
        setSections(newSections);
    };

    const removeSection = (index) => {
        const newSections = [...sections];
        newSections.splice(index, 1);
        setSections(newSections);
    };

    const removeField = (sectionIndex, fieldIndex) => {
        const newSections = [...sections];
        newSections[sectionIndex].fields.splice(fieldIndex, 1);
        setSections(newSections);
    };

    const handleSave = async () => {
        const templateData = {
            title: formTitle,
            sections: sections,
        };
        
        const result = await addFormTemplate(templateData, userAziendaId);
        setMessage(result.message);

        if (result.success) {
            setTimeout(() => onBack(), 2000);
        }
    };

    if (loadingData) {
        return <div className="text-center p-8">Caricamento in corso...</div>;
    }

    const fieldTypes = [
        { value: 'si/no/na', label: 'SI / NO / NA' },
        { value: 'text', label: 'Testo Libero' },
        { value: 'number', label: 'Numero' },
    ];

    return (
        <div className="space-y-6 p-6 bg-white rounded-lg shadow-md animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className={`text-gray-600 hover:text-gray-800 transition-colors duration-200 flex items-center gap-2`}>
                    <ArrowLeftIcon className="h-5 w-5" /> Torna indietro
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Crea Nuovo Modello</h2>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`py-2 px-6 rounded-lg text-white font-semibold transition-colors duration-200 flex items-center gap-2
                        ${isSaving ? 'bg-gray-400 cursor-not-allowed' : `${colorClasses[primaryColor].bg} ${colorClasses[primaryColor].hoverBg}`}`}
                >
                    <CheckIcon className="h-5 w-5" /> {isSaving ? 'Salvataggio...' : 'Salva Modello'}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-center ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}
            
            {/* Errore dall'hook */}
            {error && (
                <div className="p-4 rounded-lg text-center bg-red-100 text-red-700">
                    {error.message}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Titolo del Modello</label>
                <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
                    placeholder="Es. Checklist Sicurezza Settimanale"
                />
            </div>
            
            <div className="space-y-4">
                {sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative">
                        <button onClick={() => removeSection(sectionIndex)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Titolo Sezione</label>
                            <input
                                type="text"
                                value={section.title}
                                onChange={(e) => handleSectionTitleChange(sectionIndex, e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                placeholder="Es. Organizzazione del Cantiere"
                            />
                        </div>

                        <div className="space-y-2">
                            {section.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="p-3 border border-gray-300 rounded-md bg-white flex items-center gap-4">
                                    <div className="flex-grow">
                                        <label className="block text-xs font-medium text-gray-500">Domanda</label>
                                        <input
                                            type="text"
                                            value={field.question}
                                            onChange={(e) => handleFieldChange(sectionIndex, fieldIndex, 'question', e.target.value)}
                                            className="mt-1 block w-full border-gray-200 rounded-md shadow-sm text-sm"
                                            placeholder="Es. Il cantiere è dotato di recinzione idonea?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500">Tipo Risposta</label>
                                        <select
                                            value={field.type}
                                            onChange={(e) => handleFieldChange(sectionIndex, fieldIndex, 'type', e.target.value)}
                                            className="mt-1 block w-full border-gray-200 rounded-md shadow-sm text-sm"
                                        >
                                            {fieldTypes.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button onClick={() => removeField(sectionIndex, fieldIndex)} className="text-red-500 hover:text-red-700">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => addField(sectionIndex)}
                            className={`mt-4 w-full py-2 px-4 rounded-md text-white font-semibold transition-colors duration-200 flex justify-center items-center gap-2
                                ${colorClasses[primaryColor].bg} ${colorClasses[primaryColor].hoverBg}`}
                        >
                            <PlusIcon className="h-5 w-5" /> Aggiungi Domanda
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={addSection}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 border-2
                    ${colorClasses[primaryColor].text} ${colorClasses[primaryColor].border} hover:bg-gray-100`}
            >
                Aggiungi Nuova Sezione
            </button>
        </div>
    );
};

