// packages/shared-ui/forms/components/SopralluogoReportModal.jsx

// ✅ Import corretti
import React, { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react'; 

// Stili
const labelStyle = "block text-sm font-medium text-gray-700 mb-1";
const textStyle = "w-full p-2 border border-gray-300 rounded-md shadow-sm";
const sectionTitleStyle = "text-lg font-semibold text-gray-800 mb-3 border-b pb-2";

export const SopralluogoReportModal = ({
    isOpen,
    onClose,
    onSave,
    datiReport, 
    formTemplate  
}) => {

    // console.log("[SopralluogoReportModal] Prop 'formTemplate' ricevuta:", formTemplate);

    // Stato *interno* per le modifiche
    const [editedData, setEditedData] = useState({});

    // Popola lo stato quando il modal si apre o i dati cambiano
    useEffect(() => {
        if (isOpen && datiReport) {
            setEditedData(datiReport);
        } else {
            setEditedData({});
        }
    }, [isOpen, datiReport]);

    // --- ✅ Funzione per aggiustare l'altezza ---
    const adjustTextareaHeight = useCallback((textarea) => {
        if (textarea) {
            textarea.style.height = 'auto'; // Resetta l'altezza
            textarea.style.height = `${textarea.scrollHeight}px`; // Imposta all'altezza del contenuto
        }
    }, []);

    // Handler per le modifiche ai campi di testo (corretto)
    const handleChange = useCallback((e) => {
        const { name, value, target } = e.target;
        setEditedData(prev => ({ ...prev, [name]: value }));
        adjustTextareaHeight(target); 
    }, [adjustTextareaHeight]); // Dipendenza corretta

    // Handler per il salvataggio
    const handleSaveClick = () => {
        onSave(editedData);
    };

    // --- ✅ Logica di separazione e ordine (dentro useMemo) ---
    const { textFields, mediaFields } = useMemo(() => {
        const tempTextFields = []; 
        const mediaFields = [];
        
        const structure = formTemplate?.formStructure || {};
        
        // console.log("[SopralluogoReportModal] 'structure' usata per etichette e ordine:", structure); 

        Object.entries(structure).forEach(([key, fieldDefinition]) => {
            const order = fieldDefinition?.order ?? Infinity; 
            const value = editedData[key]; 

            if (fieldDefinition?.type === 'photo' || fieldDefinition?.type === 'video') {
                if (value && (Array.isArray(value) ? value.length > 0 : true)) { // Mostra anche se c'è solo una stringa
                     mediaFields.push({
                        key,
                        links: Array.isArray(value) ? value : [value] 
                    });
                }
            } 
            else if (key !== 'salvatoIl' && key !== 'salvatoDa' && !key.includes('timestamp') && key !== 'salvatoDaId' && fieldDefinition?.type !== 'photo' && fieldDefinition?.type !== 'video') { 
                const label = fieldDefinition?.bundleLabelText || fieldDefinition?.label || key;
                tempTextFields.push({ key, value, label, order }); 
            }
        });

        tempTextFields.sort((a, b) => a.order - b.order);
        
        // console.log("[SopralluogoReportModal] Campi di testo ordinati (da template):", tempTextFields);

        return { textFields: tempTextFields, mediaFields };
        
    }, [editedData, formTemplate]); // Dipendenze corrette
    // --- Fine Logica useMemo ---

    // --- ✅ Aggiusta altezza iniziale e al cambio dei campi ---
    const textFieldsContainerRef = useRef(null); 
    useLayoutEffect(() => {
        if (isOpen && textFieldsContainerRef.current) {
            const textareas = textFieldsContainerRef.current.querySelectorAll('textarea');
            textareas.forEach(adjustTextareaHeight); 
        }
    }, [isOpen, textFields, adjustTextareaHeight]); // Dipendenze corrette
    // --- Fine aggiustamento iniziale ---


    if (!isOpen) {
        return null;
    }

    return (
        <div // Overlay
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            <div // Contenitore Modal
                className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Report Sopralluogo</h2>
                    <p className="text-sm text-gray-500">Visualizza e correggi i dati inseriti dal tecnico.</p>
                </div>

                {/* Corpo (scrollabile) */}
                {/* ✅ Aggiunto ref */}
                <div ref={textFieldsContainerRef} className="p-6 overflow-y-auto space-y-6">

                    {/* Sezione Campi di Testo */}
                    {textFields.map(({ key, value, label }) => {
                        // Logica label (invariata ma corretta)
                        const displayLabel = label.startsWith('layout-bundle-') ? label.substring(label.indexOf(':', label.indexOf(':') + 1) + 1) : label;
                        const finalLabel = displayLabel.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        
                        return (
                            <div key={key}>
                                <label htmlFor={key} className={labelStyle}>{finalLabel}</label>
                                <textarea
                                    id={key}
                                    name={key}
                                    value={value || ''} 
                                    onChange={handleChange}
                                    // ✅ Classi corrette per auto-altezza
                                    className={`${textStyle} resize-none overflow-hidden`} 
                                    rows={1} 
                                />
                            </div>
                        );
                    })}

                    {/* Sezione Media (corretta) */}
                    {mediaFields.length > 0 && (
                        <div>
                            <h3 className={sectionTitleStyle}>Media Allegati</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {mediaFields.map(({ key, links }) => (
                                    links.map((link, index) => { 
                                        const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(link);
                                        const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(link); 

                                        return ( 
                                            <div 
                                                key={`${key}-${index}`} 
                                                className="block border rounded-md overflow-hidden shadow-sm"
                                            >
                                                {isImage ? ( /* ... immagine ... */ 
                                                     <a href={link} target="_blank" rel="noopener noreferrer" title="Apri immagine">
                                                        <img 
                                                            src={link} 
                                                            alt={`Media ${index + 1}`} 
                                                            className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                                                        />
                                                    </a>
                                                ): isVideo ? ( /* ... video ... */
                                                    <video 
                                                        src={link} 
                                                        controls 
                                                        muted 
                                                        playsInline 
                                                        className="w-full h-32 object-cover bg-black" 
                                                        title="Riproduci video"
                                                    >
                                                        Il tuo browser non supporta il tag video. <a href={link} target="_blank" rel="noopener noreferrer">Apri video</a>
                                                    </video>
                                                ) : ( /* ... fallback ... */
                                                    <a 
                                                        href={link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="w-full h-32 flex items-center justify-center bg-gray-100 text-gray-500 text-xs text-center p-2 hover:bg-gray-200 transition-colors"
                                                        title="Apri file"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                        </svg>
                                                        File allegato<br/>(Clicca per aprire)
                                                    </a>
                                                )}
                                            </div> 
                                        ); 
                                    }) 
                                ))} 
                            </div>
                        </div>
                    )} 
                </div> {/* Chiusura Corpo */}

                {/* Footer Pulsanti */}
                <div className="flex justify-end gap-4 mt-auto border-t p-4 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Chiudi
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Salva Correzioni
                    </button>
                </div>

            </div> {/* Chiusura Contenitore Modal */}
        </div> // Chiusura Overlay
    );
}; // Chiusura Componente