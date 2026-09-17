import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const ModaleArchiviazione = ({ isOpen, onClose, archivingUser, currentUserData, userAuth, db, app, onSuccess }) => {
    const [archiveData, setArchiveData] = useState({ motivo: 'dimissioni', dataUscita: new Date().toISOString().split('T')[0], note: '', materialeRestituito: false });
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen || !archivingUser) return null;

    const eseguiArchiviazione = async () => {
        if (!archiveData.motivo || !archiveData.dataUscita) return alert("Compila i campi obbligatori.");
        setIsSaving(true);
        try {
            await httpsCallable(getFunctions(app), 'deleteUserAuth')({ uid: archivingUser.id });
            const payload = {
                ...archivingUser, attivo: false, ruolo: 'ex_dipendente', password: '',
                datiUscita: { 
                    motivo: archiveData.motivo, dataUscita: archiveData.dataUscita, note: archiveData.note, registratoIl: new Date().toISOString(),
                    materialeRestituito: archiveData.materialeRestituito || false,
                    materialeConfermatoDaId: archiveData.materialeRestituito ? (userAuth?.uid || null) : null,
                    materialeConfermatoDaNome: archiveData.materialeRestituito ? (currentUserData ? `${currentUserData.nome} ${currentUserData.cognome}` : 'Admin') : null
                }
            };
            await setDoc(doc(db, 'users', archivingUser.id), payload, { merge: true });
            onSuccess(); // Chiama il padre per dire che ha finito
        } catch (error) { alert(`Errore: ${error.message}`); } finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-down">
                <h3 className="text-xl font-bold text-red-600 mb-2">Procedura di Uscita</h3>
                <p className="text-sm text-gray-600 mb-6">Stai per archiviare <strong className="text-gray-900">{archivingUser.nome} {archivingUser.cognome}</strong>.</p>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Motivo Uscita *</label>
                        <select className="w-full rounded-lg border-gray-300" value={archiveData.motivo} onChange={e => setArchiveData({...archiveData, motivo: e.target.value})}>
                            <option value="dimissioni">Dimissioni Volontarie</option>
                            <option value="licenziamento">Licenziamento</option>
                            <option value="scadenza">Mancato Rinnovo / Scadenza</option>
                        </select>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Data Fine Rapporto *</label><input type="date" className="w-full rounded-lg border-gray-300" value={archiveData.dataUscita} onChange={e => setArchiveData({...archiveData, dataUscita: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Note (Opzionale)</label><textarea rows="2" className="w-full rounded-lg border-gray-300 text-sm" value={archiveData.note} onChange={e => setArchiveData({...archiveData, note: e.target.value})} placeholder="Es. Lettera inviata, colloquio di uscita fatto..."/></div>
                    
                    <div className="pt-3 border-t border-gray-100">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="flex items-center h-5">
                                <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-600 h-5 w-5 mt-0.5 shadow-sm" checked={archiveData.materialeRestituito} onChange={e => setArchiveData({...archiveData, materialeRestituito: e.target.checked})} />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-gray-800 group-hover:text-green-700 transition-colors">Confermo l'avvenuta riconsegna delle dotazioni</span>
                                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Certifichi di aver ricevuto indietro tutti i DPI e le attrezzature.</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Annulla</button>
                    <button onClick={eseguiArchiviazione} disabled={isSaving} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md transition-all">{isSaving ? 'Elaborazione...' : 'Conferma Uscita'}</button>
                </div>
            </div>
        </div>
    );
};