import React, { useMemo } from 'react';
import { 
    CheckCircleIcon, 
    WrenchScrewdriverIcon, 
    ExclamationTriangleIcon,
    ArchiveBoxXMarkIcon,
    ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';

export const GestioneGuastiView = ({ 
    guasti = [], 
    accettaSegnalazione, 
    risolviRiparazione,  
    annullaSegnalazione, 
    dismettiArticolo,    
    onActionComplete,
    onBack 
}) => {
    
    // --- 1. NORMALIZZAZIONE DATI ---
    const getNomeArticolo = (a) => a.articoloNome || a.attrezzaturaNome || a.nome || 'Articolo Sconosciuto';
    const getNomeUtente = (a) => a.assegnatoA_Nome || a.utenteNome || 'Utente Sconosciuto';
    const getSeriale = (a) => a.articoloSeriale || a.attrezzaturaSeriale || '';
    
    // --- 2. SEPARAZIONE LISTE ---
    const { segnalati, inRiparazione } = useMemo(() => {
        const seg = [];
        const rip = [];
        guasti.forEach(item => {
            if (item.statoWorkflow === 'in riparazione') rip.push(item);
            else seg.push(item);
        });
        return { segnalati: seg, inRiparazione: rip };
    }, [guasti]);

    // --- 3. HANDLERS SPECIFICI E BLINDATI ---
    const handleAccettaSegnalazione = async (item) => {
        if (!window.confirm(`Mandi in riparazione: ${getNomeArticolo(item)}?`)) return;
        // Passiamo ENTRAMBI gli ID corretti al database
        const res = await accettaSegnalazione(item.id, item.articoloId || item.attrezzaturaId);
        if (res?.message) onActionComplete(res.message);
    };

    const handleRisolviRiparazione = async (item) => {
        if (!window.confirm(`Confermi risoluzione per ${getNomeArticolo(item)}?`)) return;
        
        const note = prompt("Esito intervento (Cosa è stato riparato?):");
        if (note === null) return;

        // ✅ NUOVO: Chiediamo il costo della riparazione
        const costoInput = prompt("Costo della riparazione in €? (Usa il punto o la virgola per i decimali, es: 15.50)", "0");
        if (costoInput === null) return;
        const costo = parseFloat(costoInput.replace(',', '.')) || 0;

        // Passiamo tutti i parametri (ID assegnazione, ID attrezzo, note e costo)
        const res = await risolviRiparazione(item.id, item.articoloId || item.attrezzaturaId, note, costo);
        if (res?.message) onActionComplete(res.message);
    };

    const handleAnnullaSegnalazione = async (item) => {
        if (!window.confirm(`L'articolo funziona? Lo riconsegni a ${getNomeUtente(item)}?`)) return;
        const res = await annullaSegnalazione(item.id);
        if (res?.message) onActionComplete(res.message);
    };

    const handleDismetti = async (item) => {
        if (!window.confirm(`ATTENZIONE: Vuoi dismettere definitivamente ${getNomeArticolo(item)}?`)) return;
        // Passiamo ENTRAMBI gli ID per rimuoverlo ovunque
        const res = await dismettiArticolo(item.id, item.articoloId || item.attrezzaturaId); 
        if (res?.message) onActionComplete(res.message);
    };

    return (
        <div className="animate-fade-in space-y-8 p-2">
            
            {/* SEZIONE 1: NUOVE SEGNALAZIONI */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500"/>
                        Segnalazioni da Gestire
                    </h3>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">{segnalati.length}</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full bg-white">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Attrezzatura</th>
                                <th className="py-3 px-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Problema</th>
                                <th className="py-3 px-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {segnalati.length > 0 ? (
                                segnalati.map(item => (
                                    <tr key={item.id} className="hover:bg-red-50/50 transition-colors">
                                        <td className="py-4 px-4 text-sm font-medium text-slate-900">
                                            {getNomeArticolo(item)}
                                            {getSeriale(item) && <div className="text-xs font-mono font-bold text-slate-500 mt-1">S/N: {getSeriale(item)}</div>}
                                            <div className="text-xs text-slate-500 mt-1">Da: <span className="font-bold">{getNomeUtente(item)}</span></div>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-slate-600 italic">"{item.noteGuasto || item.statoWorkflow}"</td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex gap-2 justify-end items-center">
                                                
                                                <button 
                                                    onClick={() => handleAnnullaSegnalazione(item)} 
                                                    title="Funziona (Annulla segnalazione)"
                                                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-2 rounded-lg transition-colors border border-emerald-200"
                                                >
                                                    <ArrowUturnLeftIcon className="h-5 w-5" />
                                                </button>

                                                <button 
                                                    onClick={() => handleAccettaSegnalazione(item)} 
                                                    title="Manda in Riparazione"
                                                    className="bg-orange-50 text-orange-700 hover:bg-orange-100 p-2 rounded-lg transition-colors border border-orange-200"
                                                >
                                                    <WrenchScrewdriverIcon className="h-5 w-5" />
                                                </button>

                                                <button 
                                                    onClick={() => handleDismetti(item)} 
                                                    title="Dismetti (Irreparabile)"
                                                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 p-2 rounded-lg transition-colors border border-slate-300"
                                                >
                                                    <ArchiveBoxXMarkIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" className="py-12 px-4 text-center text-slate-500 italic">Nessuna nuova segnalazione.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SEZIONE 2: IN RIPARAZIONE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="h-6 w-6 text-blue-500"/>
                        In Riparazione / Assistenza
                    </h3>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">{inRiparazione.length}</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full bg-white">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Attrezzatura</th>
                                <th className="py-3 px-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Utente</th>
                                <th className="py-3 px-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {inRiparazione.length > 0 ? (
                                inRiparazione.map(item => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="py-4 px-4 text-sm font-medium text-slate-900">
                                            {getNomeArticolo(item)}
                                            {getSeriale(item) && <div className="text-xs font-mono font-bold text-slate-500 mt-1">S/N: {getSeriale(item)}</div>}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-slate-600">{getNomeUtente(item)}</td>
                                        <td className="py-4 px-4 text-right">
                                            <button 
                                                onClick={() => handleRisolviRiparazione(item)} 
                                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 border border-emerald-200 shadow-sm"
                                            >
                                                <CheckCircleIcon className="h-4 w-4" /> Risolvi Guasto
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" className="py-12 px-4 text-center text-slate-500 italic">Nessun articolo in riparazione.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};