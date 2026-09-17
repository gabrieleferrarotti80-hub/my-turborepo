import React, { useState } from 'react';
import { ArrowLeftIcon, CubeIcon } from '@heroicons/react/24/solid';

export const ResoMaterialeForm = ({ onBack, onSave, materiale, isSaving }) => {
    const [quantita, setQuantita] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            materialeId: materiale.id,
            quantita: parseFloat(quantita)
        });
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-xl max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CubeIcon className="h-6 w-6 text-orange-600"/> Reso Materiale
            </h2>
            <p className="text-sm text-gray-600 mb-4">
                Stai restituendo: <strong>{materiale.nome}</strong><br/>
                Dal cantiere: <strong>{materiale.nomeCantiere}</strong><br/>
                Giacenza attuale: {materiale.quantita} {materiale.unitaMisura}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Quantità Resa</label>
                    <input 
                        type="number" 
                        value={quantita} 
                        onChange={(e) => setQuantita(e.target.value)} 
                        max={materiale.quantita}
                        className="w-full p-2 border rounded-lg"
                        required 
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onBack} className="px-4 py-2 bg-gray-200 rounded-lg">Annulla</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700">
                        Conferma Reso
                    </button>
                </div>
            </form>
        </div>
    );
};