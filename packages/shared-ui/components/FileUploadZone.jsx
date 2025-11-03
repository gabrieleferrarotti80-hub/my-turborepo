// packages/shared-ui/components/FileUploadZone.jsx

import React, { useState, useCallback } from 'react';

/**
 * Un componente "stupido" per il caricamento di file tramite drag-and-drop o click.
 * @param {Function} onFilesSelected - Callback che riceve un array di oggetti File.
 * @param {boolean} isUploading - Se true, mostra uno stato di caricamento e disabilita l'area.
 * @param {string} label - Il testo da mostrare all'interno della zona di drop.
 * @param {string} acceptedFileTypes - Tipi di file accettati, es. "image/*,application/pdf".
 * @param {Array} savedFiles - Un array di oggetti file {nome: string} già salvati.
 */
export const FileUploadZone = ({ 
    onFilesSelected, 
    isUploading = false,
    label = "Trascina i file qui, o clicca per selezionare",
    acceptedFileTypes = "*",
    savedFiles = [] // <-- 1. Aggiunta la nuova prop
}) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const inputRef = React.useRef(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0] && !isUploading) {
            onFilesSelected(Array.from(e.dataTransfer.files));
        }
    }, [isUploading, onFilesSelected]);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0] && !isUploading) {
            onFilesSelected(Array.from(e.target.files));
        }
    };
    
    const onZoneClick = () => {
        if (!isUploading) {
            inputRef.current.click();
        }
    };

    const zoneStyle = {
        border: `2px dashed ${isDragActive ? '#007bff' : '#ccc'}`,
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        cursor: isUploading ? 'not-allowed' : 'pointer',
        backgroundColor: isUploading ? '#f8f9fa' : (isDragActive ? '#e9f5ff' : '#fff'),
        transition: 'border-color 0.2s, background-color 0.2s',
    };

    // Stili per la lista dei file salvati (per coerenza con il tuo file)
    const savedListStyle = {
        marginBottom: '12px',
        padding: '10px',
        border: '1px solid #eee',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        textAlign: 'left',
    };

    const listTitleStyle = {
        margin: 0,
        marginBottom: '5px',
        fontSize: '0.9em',
        fontWeight: 'bold',
        color: '#555'
    };
    
    const listItemStyle = {
        fontSize: '0.9em',
        color: '#333',
        margin: '2px 0'
    };

    return (
        <div>
            {/* --- 3. BLOCCO AGGIUNTO PER MOSTRARE I FILE SALVATI --- */}
            {savedFiles && savedFiles.length > 0 && (
                <div style={savedListStyle}>
                    <h4 style={listTitleStyle}>File già presenti:</h4>
                    <ul style={{ listStylePosition: 'inside', paddingLeft: 0, margin: 0 }}>
                        {savedFiles.map((file, index) => (
                            <li key={index} style={listItemStyle}>
                                {file.nome}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {/* --- FINE BLOCCO AGGIUNTO --- */}

            {/* Questa è la dropzone originale dal tuo file */}
            <div 
                style={zoneStyle}
                onClick={onZoneClick}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    onChange={handleChange}
                    accept={acceptedFileTypes}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                />
                {isUploading ? <p>Caricamento in corso...</p> : <p>{label}</p>}
            </div>
        </div>
    );
};