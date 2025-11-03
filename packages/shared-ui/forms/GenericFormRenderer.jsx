// packages/shared-ui/forms/GenericFormRenderer.jsx
import React from 'react';
// ✅ Importa le icone necessarie
import { PhoneIcon, MapPinIcon, EnvelopeIcon, LinkIcon } from '@heroicons/react/24/solid';

// Componente fittizio per l'upload - sostituisci col tuo
const FileUploadZone = ({ onFileSelect, isUploading }) => (
    <input type="file" onChange={(e) => onFileSelect(e.target.files[0])} disabled={isUploading} />
);

// --- FUNZIONE HELPER: RENDERIZZA IL COMPONENTE DI INPUT ALL'INTERNO DI UN LAYOUT-BUNDLE ---
// ✅ Modificata: Restituisce solo l'elemento input, non il wrapper con icona
const renderBundleInput = (fieldId, fieldConfig, value, onChange, onFileUpload, isUploading) => {
    // Il tipo da renderizzare è contenuto in bundleComponentType
    const type = fieldConfig.bundleComponentType;
    const role = fieldConfig.fieldRole; // Leggiamo il ruolo per logica interna (es. type='tel')
    const options = fieldConfig.bundleOptions || [];
    const safeOptions = Array.isArray(options) && options.length > 0 && typeof options[0] === 'string'
        ? options[0].split(';').map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))
        : options;
    const isReadOnly = type === 'chained-query';

    switch (type) {
        case 'text':
        case 'date':
            return (
                <input
                    type={role === 'phone' ? 'tel' : type} // Usa type='tel' se il ruolo è phone
                    value={value}
                    onChange={(e) => onChange(fieldId, e.target.value)}
                    readOnly={isReadOnly}
                    className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
            );
        case 'dropdown':
            return (
                <select
                    value={value}
                    onChange={(e) => onChange(fieldId, e.target.value)}
                    disabled={isReadOnly}
                    className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                    <option value="">Seleziona...</option>
                    {safeOptions.map((opt, index) => (
                        <option key={opt.value || index} value={opt.value || opt.label}>{opt.label}</option>
                    ))}
                </select>
            );
        case 'chained-query':
            return (
                <input
                    type={role === 'phone' ? 'tel' : 'text'}
                    value={value || 'Caricamento...'}
                    readOnly
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-800 cursor-not-allowed"
                />
            );
        case 'file':
            return (
                <FileUploadZone
                    onFileSelect={(file) => onFileUpload(fieldId, file)}
                    isUploading={isUploading}
                />
            );
        default:
            return <p className="text-red-500 text-xs mt-1">Tipo bundle non supportato: {type}</p>;
    }
};


export const GenericFormRenderer = ({
    templateStructure,
    formData,
    isLoading,
    isUploading,
    onChange,
    onFileUpload
}) => {

    if (isLoading) {
        return <div className="text-center p-8">Caricamento template modulo...</div>;
    }

    if (!templateStructure) {
        return <div className="text-center p-8 text-red-600">Errore: Template non trovato.</div>;
    }

    // Funzione helper principale per renderizzare i campi
    const renderField = (fieldId, fieldConfig) => {
        const value = formData[fieldId] || '';

        switch (fieldConfig.type) {
            case 'text':
            case 'number':
                return (
                    <div key={fieldId} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{fieldConfig.label}</label>
                        <input
                            type={fieldConfig.type}
                            value={value}
                            onChange={(e) => onChange(fieldId, e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            placeholder={fieldConfig.placeholder || ''}
                        />
                    </div>
                );
            case 'textarea':
                return (
                    <div key={fieldId} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{fieldConfig.label}</label>
                        <textarea
                            value={value}
                            onChange={(e) => onChange(fieldId, e.target.value)}
                            rows="4"
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            placeholder={fieldConfig.placeholder || ''}
                        />
                    </div>
                );
            case 'file':
                 // Questo caso gestisce i campi 'file' che NON sono in un 'layout-bundle'
                return (
                    <div key={fieldId} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{fieldConfig.label}</label>
                        <FileUploadZone
                            onFileSelect={(file) => onFileUpload(fieldId, file)}
                            isUploading={isUploading}
                        />
                        {isUploading && <p className="text-sm text-gray-500">Caricamento...</p>}
                        {value && <p className="text-sm text-green-600">File caricato: {value}</p>}
                    </div>
                );

            case 'static-text':
            case 'chained-query':
            case 'select':
                // Trattamento legacy/semplice per campi NON-BUNDLE
                return (
                    <div key={fieldId} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">{fieldConfig.label || fieldConfig.content}</label>
                        <input
                            type="text"
                            value={value}
                            readOnly
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-800 cursor-not-allowed"
                        />
                    </div>
                );

            case 'photo': // Nome tipo come da tuo errore
            case 'video': // Nome tipo come da tuo errore
                const existingFiles = Array.isArray(value) ? value : (value ? [value] : []);
                const acceptType = fieldConfig.type === 'photo' ? 'image/*' : 'video/*';
                const buttonLabel = fieldConfig.type === 'photo' ? 'Aggiungi Foto' : 'Aggiungi Video';
                return (
                    <div key={fieldId} className="p-3 mb-4 border border-gray-300 rounded-lg shadow-sm bg-white">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{fieldConfig.label}</label>
                        {existingFiles.length > 0 && (
                            <div className="mb-2 space-y-1">
                                {existingFiles.map((fileUrl, index) => (
                                    <div key={index} className="text-xs text-blue-600 truncate">
                                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">{fileUrl.split('/').pop().split('?')[0]}</a>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => onFileUpload(fieldId, acceptType)}
                            disabled={isUploading}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {isUploading ? 'Caricando...' : buttonLabel}
                        </button>
                    </div>
                );

           case 'layout-bundle':
                // 1. ETICHETTA (Sinistra)
                const LabelComponent = (
                    // ✅ Aggiunto padding destro ESPLICITO pr-4 (16px)
                    <div className="font-semibold text-gray-700 text-sm w-[180px] flex-shrink-0 pr-4">
                        {fieldConfig.bundleLabelText}
                    </div>

                );



                // 2. INPUT (Centro) - Renderizzato tramite helper

                const InputComponent = renderBundleInput(

                    fieldId,

                    fieldConfig,

                    value,

                    onChange,

                    onFileUpload,

                    isUploading

                );



                // ✅ 3. ICONA (Destra) - Generata qui

                let ActionIcon = null;

                const role = fieldConfig.fieldRole;

                const valueForAction = value;



                if (role && valueForAction) {

                    let href = '#';

                    let IconComponent = null;

                    let target = '_self';



                    if (role === 'phone') {

                        const phoneNumber = String(valueForAction).replace(/[^0-9]/g, '');

                        if (phoneNumber) { href = `tel:${phoneNumber}`; IconComponent = PhoneIcon; }

                    } else if (role === 'address') {

                        const encodedAddress = encodeURIComponent(valueForAction);

                        if (encodedAddress) { href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`; IconComponent = MapPinIcon; target = '_blank'; }

                    } else if (role === 'email') {

                        href = `mailto:${valueForAction}`; IconComponent = EnvelopeIcon;

                    } else if (role === 'url') {

                        const url = String(valueForAction).startsWith('http') ? valueForAction : `http://${valueForAction}`;

                        href = url; IconComponent = LinkIcon; target = '_blank';

                    }



                    if (IconComponent) {

                        ActionIcon = (

                            <a

                                href={href}

                                target={target}

                                rel="noopener noreferrer"

                                aria-label={`Azione per ${role}`}

                                className="p-2 bg-gray-600 text-white rounded-full shadow-md hover:bg-gray-700 flex-shrink-0 ml-2" // ml-2 per spazio

                            >

                                <IconComponent className="h-5 w-5" />

                            </a>

                        );

                    }

                }



             return (
                    // ✅ RIMOSSO gap-x-4. Usiamo padding sulla label.
                    <div 
                        key={fieldId} 
                        className="p-3 mb-4 flex items-center 
                                   border border-gray-300 rounded-lg shadow-sm bg-white" 
                    > 
                        {LabelComponent} 
                        
                        <div className="flex-1 min-w-[150px]"> 
                            {InputComponent}
                        </div>
                        {/* Nessuna icona qui */}
                    </div>
                );

            default:
                return <p key={fieldId}>Tipo campo non supportato: {fieldConfig.type}</p>;
        }
    };

    // RENDER PRINCIPALE: Usa 'order' se esiste, altrimenti usa 'y'.
    const fieldIds = Object.keys(templateStructure).sort((a, b) => {
        const orderA = templateStructure[a].order !== undefined ? templateStructure[a].order : templateStructure[a].y;
        const orderB = templateStructure[b].order !== undefined ? templateStructure[b].order : templateStructure[b].y;
        const fallbackA = Number(orderA) || 0;
        const fallbackB = Number(orderB) || 0;
        return fallbackA - fallbackB;
    });

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            {fieldIds.map(fieldId => renderField(fieldId, templateStructure[fieldId]))}
        </div>
    );
};