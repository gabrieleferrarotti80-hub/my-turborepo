import React, { useState } from 'react';

export const AddNotaOperativaForm = ({ onSubmit, onCancel, isSaving }) => {
    const [note, setNote] = useState('');
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            setFiles(prev => [...prev, ...selectedFiles]);
            const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (files.length === 0) {
            setError("Aggiungi almeno una foto.");
            return;
        }
        const result = await onSubmit(note, files);
        if (!result.success) {
            setError(result.message);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow-xl">
            <h2 className="text-xl font-bold text-gray-800">Crea Nota Operativa</h2>

            {/* Anteprima Immagini */}
            {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {previews.map((src, index) => (
                        <img key={index} src={src} alt={`Anteprima ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                    ))}
                </div>
            )}

            {/* Pulsante Aggiungi Foto */}
            <input
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                id="file-input"
                className="hidden"
            />
            <label htmlFor="file-input" className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Aggiungi Foto
            </label>

            {/* Textarea per le Note */}
            <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700">Note</label>
                <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="Inserisci qui le tue note..."
                />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Pulsanti di Azione */}
            <div className="flex justify-end gap-4">
                <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">
                    Annulla
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait">
                    {isSaving ? 'Salvataggio...' : 'Salva Nota'}
                </button>
            </div>
        </form>
    );
};