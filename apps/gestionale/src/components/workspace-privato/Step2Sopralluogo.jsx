import React from 'react';
import { CalendarDaysIcon, CheckCircleIcon, PaperAirplaneIcon, CheckIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export const Step2Sopralluogo = ({
    offerta,
    eventoCollegato,
    dataSopralluogo,
    setDataSopralluogo,
    tecnicoSopralluogo,
    setTecnicoSopralluogo,
    dipendenti,
    noteSopralluogo,
    setNoteSopralluogo,
    isSaving,
    creaEventoAgenda,
    selectedFormId,
    setSelectedFormId,
    forms,
    creaReportApp,
    reportsOfferta,
    onNext
}) => {
    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-extrabold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2"><CalendarDaysIcon className="h-6 w-6 text-indigo-500"/> Pianificazione Agenda</h3>
                
                {eventoCollegato && eventoCollegato.stato === 'confermato' ? (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3">
                        <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
                        <div><p className="font-bold text-sm">Appuntamento Confermato dal Tecnico!</p><p className="text-xs mt-1">Il tecnico ha accettato l'incarico dalla sua app ed è bloccato in agenda.</p></div>
                    </div>
                ) : eventoCollegato && eventoCollegato.stato === 'da_confermare' ? (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 flex items-start gap-3">
                        <CalendarDaysIcon className="h-6 w-6 flex-shrink-0" />
                        <div><p className="font-bold text-sm">Richiesta Inviata, in attesa del Tecnico...</p><p className="text-xs mt-1">Stiamo attendendo che il tecnico confermi la disponibilità sull'app.</p></div>
                    </div>
                ) : offerta.stato === 'sopralluogo_fissato' ? (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-3">
                        <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
                        <div><p className="font-bold text-sm">Sopralluogo Fissato Manualmente</p><p className="text-xs mt-1">L'evento è stato confermato manualmente dall'ufficio.</p></div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data e Ora Proposta / Prevista</label>
                        <input type="datetime-local" value={dataSopralluogo} onChange={e=>setDataSopralluogo(e.target.value)} className="w-full rounded-xl border-slate-300 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tecnico Incaricato</label>
                        <select value={tecnicoSopralluogo} onChange={e=>setTecnicoSopralluogo(e.target.value)} className="w-full rounded-xl border-slate-300 focus:ring-indigo-500">
                            <option value="">-- Seleziona un Tecnico --</option>
                            {dipendenti.map(u => <option key={u.id} value={u.id}>{u.nome} {u.cognome} ({u.ruolo})</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note Ufficio (Opzionali)</label>
                        <textarea rows="2" placeholder="Note interne all'ufficio per questo appuntamento..." value={noteSopralluogo} onChange={e=>setNoteSopralluogo(e.target.value)} className="w-full rounded-xl border-slate-300 focus:ring-indigo-500"></textarea>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => creaEventoAgenda('da_confermare')} disabled={isSaving} className="px-5 py-2.5 bg-sky-100 text-sky-700 font-bold rounded-xl hover:bg-sky-200 transition-colors flex items-center justify-center gap-2">
                        <PaperAirplaneIcon className="h-4 w-4" /> 1. Chiedi Disponibilità (App)
                    </button>
                    <button onClick={() => creaEventoAgenda('confermato')} disabled={isSaving} className="px-5 py-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl hover:bg-emerald-200 flex items-center justify-center gap-2">
                        <CheckIcon className="h-4 w-4" /> Oppure Forza Appuntamento
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
                <div className="flex justify-between items-center border-b pb-2 mb-6">
                    <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><ClipboardDocumentListIcon className="h-6 w-6 text-indigo-500"/> Modulistica App (Sopralluogo)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assegna un nuovo Modulo</label>
                        <select value={selectedFormId} onChange={e=>setSelectedFormId(e.target.value)} className="w-full rounded-lg border-slate-300 text-sm mb-3">
                            <option value="">-- Scegli Template --</option>
                            {forms.map(f => <option key={f.id} value={f.id}>{f.titolo || f.nome}</option>)}
                        </select>
                        <button onClick={creaReportApp} disabled={isSaving || !selectedFormId} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                            Genera in App
                        </button>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">Il modulo verrà precompilato con i dati del cliente.</p>
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Moduli Assegnati a questa Offerta</label>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {reportsOfferta.length > 0 ? reportsOfferta.map(r => (
                                <div key={r.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 transition-colors">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{r.nomeForm || r.titolo}</p>
                                        <p className="text-[10px] text-slate-500">Tecnico: <span className="font-bold">{r.nomeTecnico || 'N.D.'}</span> - {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('it-IT') : ''}</p>
                                    </div>
                                    <div>
                                        {r.stato === 'compilato' || r.stato === 'completato' ? (
                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase shadow-sm">Compilato ✅</span>
                                        ) : (
                                            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-[10px] font-black uppercase shadow-sm">Da Compilare ⏳</span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nessun modulo generato</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 mt-6 border-t border-slate-100 gap-3">
                    <button onClick={onNext} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md">Procedi ai Costi ➔</button>
                </div>
            </div>
        </div>
    );
};