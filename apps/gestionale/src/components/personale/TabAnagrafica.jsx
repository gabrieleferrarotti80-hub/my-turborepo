import React from 'react';
import { DocumentTextIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';

export const TabAnagrafica = ({
    selectedUser, setSelectedUser, isNewUser, isStorico, canViewCosts,
    updateNestedField, applicaRinnovo,
    selectedCategory, setSelectedCategory, docExpiryDate, setDocExpiryDate,
    uploadingFile, handleFileUpload, DOC_CATEGORIES, contrattiCCNL
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Dati Personali e Recapiti</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase">Nome *</label><input required className="w-full rounded-lg border-gray-300" type="text" value={selectedUser?.nome || ''} onChange={e => setSelectedUser({...selectedUser, nome: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase">Cognome *</label><input required className="w-full rounded-lg border-gray-300" type="text" value={selectedUser?.cognome || ''} onChange={e => setSelectedUser({...selectedUser, cognome: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase">Codice Fiscale</label><input className="w-full rounded-lg border-gray-300 font-mono uppercase" type="text" value={selectedUser?.codiceFiscale || ''} onChange={e => setSelectedUser({...selectedUser, codiceFiscale: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase">Data Nascita</label><input className="w-full rounded-lg border-gray-300" type="date" value={selectedUser?.dataNascita || ''} onChange={e => setSelectedUser({...selectedUser, dataNascita: e.target.value})} /></div>
                    
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase">Tel. Aziendale</label><input className="w-full rounded-lg border-gray-300" type="tel" value={selectedUser?.telefonoAziendale || ''} onChange={e => setSelectedUser({...selectedUser, telefonoAziendale: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 uppercase">Tel. Privato</label><input className="w-full rounded-lg border-gray-300" type="tel" value={selectedUser?.telefonoPrivato || ''} onChange={e => setSelectedUser({...selectedUser, telefonoPrivato: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="block text-[10px] font-bold text-gray-400 uppercase">Email Personale / App *</label><input required className="w-full rounded-lg border-gray-300 bg-gray-50" type="email" disabled={!isNewUser} value={selectedUser?.email || ''} onChange={e => setSelectedUser({...selectedUser, email: e.target.value})} /></div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input type="checkbox" checked={selectedUser?.domicilio?.domicilioUgualeResidenza !== false} onChange={e => updateNestedField('domicilio', null, 'domicilioUgualeResidenza', e.target.checked)} className="rounded text-indigo-600 h-5 w-5" />
                        <span className="text-sm font-medium text-gray-700 italic">Il domicilio coincide con la residenza</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-gray-400 uppercase">Via Residenza</label><input className="w-full rounded-lg border-gray-300" type="text" value={selectedUser?.residenza?.via || ''} onChange={e => updateNestedField('residenza', null, 'via', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase">Città</label><input className="w-full rounded-lg border-gray-300" type="text" value={selectedUser?.residenza?.citta || ''} onChange={e => updateNestedField('residenza', null, 'citta', e.target.value)} /></div>
                        <div><label className="block text-[10px] font-bold text-gray-400 uppercase">Provincia / CAP</label><div className="flex gap-2"><input className="w-1/3 rounded-lg border-gray-300 text-center uppercase" type="text" maxLength={2} placeholder="PR" value={selectedUser?.residenza?.provincia || ''} onChange={e => updateNestedField('residenza', null, 'provincia', e.target.value)} /><input className="w-2/3 rounded-lg border-gray-300" type="text" maxLength={5} placeholder="CAP" value={selectedUser?.residenza?.cap || ''} onChange={e => updateNestedField('residenza', null, 'cap', e.target.value)} /></div></div>
                    </div>
                    {selectedUser?.domicilio?.domicilioUgualeResidenza === false && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                            <div className="md:col-span-2"><label className="block text-[10px] font-bold text-indigo-600 uppercase">Via Domicilio</label><input className="w-full rounded-lg border-indigo-200" type="text" value={selectedUser?.domicilio?.via || ''} onChange={e => updateNestedField('domicilio', null, 'via', e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-indigo-600 uppercase">Città Domicilio</label><input className="w-full rounded-lg border-indigo-200" type="text" value={selectedUser?.domicilio?.citta || ''} onChange={e => updateNestedField('domicilio', null, 'citta', e.target.value)} /></div>
                            <div><label className="block text-[10px] font-bold text-indigo-600 uppercase">Provincia (PR)</label><input className="w-full rounded-lg border-indigo-200 uppercase text-center" type="text" maxLength={2} value={selectedUser?.domicilio?.provincia || ''} onChange={e => updateNestedField('domicilio', null, 'provincia', e.target.value)} /></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
                    <div className="flex justify-between items-center mb-4 border-b border-indigo-200 pb-2">
                        <h3 className="text-lg font-bold text-indigo-900">Inquadramento e Contratto</h3>
                        {!isStorico && (
                            <div className="flex gap-2">
                                <button type="button" onClick={() => applicaRinnovo(6)} className="text-[10px] font-bold bg-white text-indigo-600 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">+ 6 Mesi</button>
                                <button type="button" onClick={() => applicaRinnovo('indeterminato')} className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">Indeterminato</button>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><label className="block text-[10px] font-bold text-indigo-800 uppercase">Ruolo App *</label>
                            <select className="w-full rounded-lg border-indigo-200 font-bold text-indigo-900" value={selectedUser?.ruolo || ''} onChange={e => setSelectedUser({...selectedUser, ruolo: e.target.value})}>
                                <option value="operaio">Dipendente</option>
                                <option value="preposto">Preposto</option>
                                <option value="tecnico">Tecnico</option>
                                <option value="amministrazione">Admin</option>
                            </select>
                        </div>
                        {canViewCosts ? <div><label className="block text-[10px] font-bold text-indigo-800 uppercase">Costo Orario (€)</label><input className="w-full rounded-lg border-indigo-200 font-bold" type="number" step="0.01" value={selectedUser?.costoOrario || ''} onChange={e => setSelectedUser({...selectedUser, costoOrario: e.target.value})} /></div> : <div></div>}
                        
                        <div className="md:col-span-2 border-t border-indigo-100 pt-3">
                            <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">Contratto Applicato (CCNL)</label>
                            <select className="w-full rounded-lg border-indigo-200 text-sm bg-white" value={selectedUser?.contrattoApplicato || ''} onChange={e => setSelectedUser({...selectedUser, contrattoApplicato: e.target.value})}>
                                <option value="" disabled>-- Seleziona il Contratto --</option>
                                {contrattiCCNL.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.ferieAnnueGG}gg Ferie / {c.permessiAnnuiH}h Permessi)</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">Orario di Lavoro (%)</label>
                            <div className="flex items-center gap-2">
                                <input type="number" min="1" max="100" className="w-full rounded-lg border-indigo-200 font-bold text-center" value={selectedUser?.percentualeLavoro || 100} onChange={e => setSelectedUser({...selectedUser, percentualeLavoro: Number(e.target.value)})} />
                                <span className="text-xs font-bold text-indigo-600">%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 border-t border-indigo-100 pt-3">
                        <div><label className="block text-[10px] font-bold text-indigo-500 uppercase">Assunzione</label><input className="w-full rounded-lg border-indigo-200" type="date" value={selectedUser?.dataAssunzione || ''} onChange={e => setSelectedUser({...selectedUser, dataAssunzione: e.target.value})} /></div>
                        <div><label className="block text-[10px] font-bold text-indigo-500 uppercase">Scadenza</label><input className="w-full rounded-lg border-indigo-200" type="date" value={selectedUser?.scadenzaContratto || ''} onChange={e => setSelectedUser({...selectedUser, scadenzaContratto: e.target.value})} /></div>
                    </div>
                    <div><label className="block text-[10px] font-bold text-indigo-500 uppercase">Note / Storico Rinnovi</label><textarea rows="2" className="w-full rounded-lg border-indigo-200 text-sm" value={selectedUser?.noteRinnovo || ''} onChange={e => setSelectedUser({...selectedUser, noteRinnovo: e.target.value})} /></div>
                </div>

                <div className="bg-amber-50 p-6 rounded-2xl shadow-sm border border-amber-100">
                    <h3 className="text-lg font-bold text-amber-900 mb-4 border-b border-amber-200 pb-2">Scadenziario Personale</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-bold text-amber-800 uppercase">Scadenza Patente</label><input type="date" value={selectedUser?.documentiPersonali?.scadenze?.patente || ''} onChange={e => updateNestedField('documentiPersonali', 'scadenze', 'patente', e.target.value)} className="w-full rounded-lg border-amber-300" /></div>
                        <div><label className="block text-[10px] font-bold text-amber-800 uppercase">Tipo Patente</label><input type="text" placeholder="Es. B, CQC" value={selectedUser?.documentiPersonali?.patente?.tipologia || ''} onChange={e => updateNestedField('documentiPersonali', 'patente', 'tipologia', e.target.value.toUpperCase())} className="w-full rounded-lg border-amber-300 font-bold" /></div>
                        <div><label className="block text-[10px] font-bold text-amber-800 uppercase">Carta Identità</label><input type="date" value={selectedUser?.documentiPersonali?.scadenze?.cartaIdentita || ''} onChange={e => updateNestedField('documentiPersonali', 'scadenze', 'cartaIdentita', e.target.value)} className="w-full rounded-lg border-amber-300" /></div>
                        <div><label className="block text-[10px] font-bold text-amber-800 uppercase">Permesso Soggiorno</label><input type="date" value={selectedUser?.documentiPersonali?.scadenze?.permessoSoggiorno || ''} onChange={e => updateNestedField('documentiPersonali', 'scadenze', 'permessoSoggiorno', e.target.value)} className="w-full rounded-lg border-amber-300" /></div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Archivio Documenti HR</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Categoria</label><select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm">{DOC_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>)}</select></div>
                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Scadenza (Opzionale)</label><input className="w-full rounded-lg border-gray-300 text-sm" type="date" value={docExpiryDate} onChange={e => setDocExpiryDate(e.target.value)} /></div>
                        <div className="relative border-2 border-dashed border-indigo-300 rounded-lg p-4 text-center hover:bg-white transition-all cursor-pointer bg-indigo-50">
                            <input type="file" disabled={isNewUser || uploadingFile || isStorico} onChange={(e) => handleFileUpload(e, 'doc')} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <p className="text-sm font-bold text-indigo-700">{uploadingFile ? 'Caricamento...' : '+ Allega File'}</p>
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-2 max-h-[220px] overflow-y-auto pr-2 pointer-events-auto">
                        {selectedUser?.documenti?.length > 0 ? selectedUser.documenti.map((doc, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><DocumentTextIcon className="h-5 w-5"/></div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{doc.nome}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-medium">{DOC_CATEGORIES.find(c => c.id === doc.categoria)?.label || 'Altro'} {doc.dataScadenza ? ` | Scad. ${new Date(doc.dataScadenza).toLocaleDateString('it')}` : ''}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"><EyeIcon className="h-4 w-4" /></a>
                                    {!isStorico && <button type="button" onClick={() => setSelectedUser({...selectedUser, documenti: selectedUser.documenti.filter((_, idx) => idx !== i)})} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><TrashIcon className="h-4 w-4" /></button>}
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-400 py-8 italic bg-gray-50 rounded-xl border border-dashed">Nessun documento in archivio.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};