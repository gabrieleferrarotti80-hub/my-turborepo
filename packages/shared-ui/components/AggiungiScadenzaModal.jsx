import React, { useState } from 'react';
import { XMarkIcon, CalendarDaysIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/solid';

export const AggiungiScadenzaModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    attrezzature = [] // Lista completa mezzi per scegliere a chi assegnare la scadenza
}) => {
    
    const [formData, setFormData] = useState({
        attrezzaturaId: '',
        tipoScadenza: 'assicurazione', // assicurazione, bollo, revisione, tagliando, altro
        dataScadenza: '',
        kmScadenza: '', // Opzionale: scadenza a KM
        ricorrenzaMesi: '', // Opzionale: ogni quanto si ripete
        avvisoGiorni: '30', // Giorni di preavviso per il giallo
        note: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        if (!formData.attrezzaturaId || (!formData.dataScadenza && !formData.kmScadenza)) {
            alert("Seleziona un mezzo e una data (o km) di scadenza.");
            return;
        }
        
        const mezzo = attrezzature.find(a => a.id === formData.attrezzaturaId);

        onSave({
            ...formData,
            nomeMezzo: mezzo ? mezzo.nome : 'Sconosciuto',
            targaMezzo: mezzo?.dettagli?.targa || ''
        });
        onClose();
    };

    // Filtra solo Automezzi e Attrezzature (no materiali)
    const assetList = attrezzature.filter(a => a.tipoArticolo === 'attrezzatura');

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
                
                <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <CalendarDaysIcon className="h-6 w-6" /> Nuova Scadenza
                    </h2>
                    <button onClick={onClose}><XMarkIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-6 space-y-4">
                    
                    {/* Mezzo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mezzo / Attrezzatura</label>
                        <select name="attrezzaturaId" value={formData.attrezzaturaId} onChange={handleChange} className="w-full p-2 border rounded-lg">
                            <option value="">-- Seleziona --</option>
                            {assetList.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.nome} {a.dettagli?.targa ? `(${a.dettagli.targa})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tipo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Scadenza</label>
                        <select name="tipoScadenza" value={formData.tipoScadenza} onChange={handleChange} className="w-full p-2 border rounded-lg">
                            <option value="assicurazione">Assicurazione</option>
                            <option value="bollo">Bollo</option>
                            <option value="revisione">Revisione</option>
                            <option value="tagliando">Tagliando / Manutenzione</option>
                            <option value="altro">Altro</option>
                        </select>
                    </div>

                    {/* Data */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Scadenza</label>
                            <input type="date" name="dataScadenza" value={formData.dataScadenza} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Entro Km (Opz.)</label>
                            <input type="number" name="kmScadenza" value={formData.kmScadenza} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Es. 150000" />
                        </div>
                    </div>

                    {/* Ricorrenza */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ripeti ogni (Mesi)</label>
                            <input type="number" name="ricorrenzaMesi" value={formData.ricorrenzaMesi} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Es. 12" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Preavviso (Giorni)</label>
                            <input type="number" name="avvisoGiorni" value={formData.avvisoGiorni} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                        <textarea name="note" value={formData.note} onChange={handleChange} className="w-full p-2 border rounded-lg" rows={2} />
                    </div>

                </div>

                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium">Annulla</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Salva Scadenza</button>
                </div>

            </div>
        </div>
    );
};