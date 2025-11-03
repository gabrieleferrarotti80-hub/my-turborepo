import React, { useState, useEffect, useMemo } from 'react';
import { FileUploadZone } from '../components/FileUploadZone'; 
// Assumiamo che tu abbia un componente Modal standard
// Se non lo hai, possiamo crearlo o usare un div
// import { Modal } from '../../components/Modal'; 

// Stili
const inputStyle = "w-full p-2 border border-gray-300 rounded-md shadow-sm";
const labelStyle = "block text-sm font-medium text-gray-700";
const totalLabelStyle = "block text-sm font-medium text-gray-800";
const totalValueStyle = "mt-1 text-2xl font-bold text-gray-900";

export const AnalisiCostiForm = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialValues = {} 
}) => {
    
    // Stato interno per tutti i campi del modal
    const [costi, setCosti] = useState({
        manodopera: 0,
        attrezzature: 0,
        macchinari: 0,
        materiali: 0,
        imprevistiPercent: 10, // Default 10%
    });
    const [fileDaCaricare, setFileDaCaricare] = useState([]);

    // Popola lo stato se ci sono valori iniziali
    useEffect(() => {
        if (isOpen && initialValues) {
            setCosti({
                manodopera: initialValues.manodopera || 0,
                attrezzature: initialValues.attrezzature || 0,
                macchinari: initialValues.macchinari || 0,
                materiali: initialValues.materiali || 0,
                imprevistiPercent: initialValues.imprevistiPercent ?? 10,
            });
            // Qui dovresti anche gestire i 'savedFiles' per la FileUploadZone
            setFileDaCaricare([]); // Resetta i file in coda
        }
    }, [isOpen, initialValues]);

    // Calcoli derivati
    const costiBase = useMemo(() => {
        return (
            parseFloat(costi.manodopera) + 
            parseFloat(costi.attrezzature) + 
            parseFloat(costi.macchinari) + 
            parseFloat(costi.materiali)
        );
    }, [costi.manodopera, costi.attrezzature, costi.macchinari, costi.materiali]);

    const valoreImprevisti = useMemo(() => {
        return costiBase * (parseFloat(costi.imprevistiPercent) / 100);
    }, [costiBase, costi.imprevistiPercent]);

    const costiTotali = useMemo(() => {
        return costiBase + valoreImprevisti;
    }, [costiBase, valoreImprevisti]);

    // Handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCosti(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveClick = () => {
        // Prepara l'oggetto da restituire al genitore
        const datiDaSalvare = {
            ...costi,
            totaleBase: costiBase,
            totaleImprevisti: valoreImprevisti,
            totale: costiTotali,
            fileDaCaricare: fileDaCaricare 
        };
        onSave(datiDaSalvare);
    };

    if (!isOpen) {
        return null;
    }

    // --- JSX del Modal ---
    // (Sto usando classi Tailwind e un div come modal. 
    // Adattalo al tuo componente <Modal> se ne hai uno)
    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose} // Chiude se si clicca fuori
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()} // Evita la chiusura se si clicca dentro
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Analisi Dettagliata dei Costi</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Colonna Campi */}
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="manodopera" className={labelStyle}>Manodopera (€)</label>
                                <input type="number" name="manodopera" value={costi.manodopera} onChange={handleChange} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="attrezzature" className={labelStyle}>Attrezzature (€)</label>
                                <input type="number" name="attrezzature" value={costi.attrezzature} onChange={handleChange} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="macchinari" className={labelStyle}>Macchinari (€)</label>
                                <input type="number" name="macchinari" value={costi.macchinari} onChange={handleChange} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="materiali" className={labelStyle}>Materiali (€)</label>
                                <input type="number" name="materiali" value={costi.materiali} onChange={handleChange} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="imprevistiPercent" className={labelStyle}>Imprevisti (%)</label>
                                <input type="number" name="imprevistiPercent" value={costi.imprevistiPercent} onChange={handleChange} className={inputStyle} />
                            </div>
                        </div>
                        
                        {/* Colonna Riepilogo */}
                        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                            <div>
                                <span className={totalLabelStyle}>Costi Base</span>
                                <span className={totalValueStyle}>{costiBase.toFixed(2)} €</span>
                            </div>
                            <div>
                                <span className={totalLabelStyle}>Quota Imprevisti</span>
                                <span className={totalValueStyle}>{valoreImprevisti.toFixed(2)} €</span>
                            </div>
                            <div className="border-t pt-4">
                                <span className={totalLabelStyle}>COSTI TOTALI</span>
                                <span className={`${totalValueStyle} text-blue-600`}>{costiTotali.toFixed(2)} €</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* File Upload */}
                    <div>
                        <label className={`${labelStyle} mb-2`}>File di Dettaglio (Computi, Listini)</label>
                        <FileUploadZone onFilesSelected={setFileDaCaricare} />
                        {fileDaCaricare.length > 0 && (
                            <ul className="mt-2 text-sm text-gray-600">
                                {fileDaCaricare.map(f => <li key={f.name}>{f.name}</li>)}
                            </ul>
                        )}
                    </div>

                    {/* Pulsanti Azione */}
                    <div className="flex justify-end gap-4 mt-6 border-t pt-4">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        >
                            Annulla
                        </button>
                        <button 
                            type="button"
                            onClick={handleSaveClick}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Salva Analisi Costi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};