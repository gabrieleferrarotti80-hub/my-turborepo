import React, { useState, useMemo } from 'react';
import { 
    MapPinIcon, ClockIcon, PhotoIcon, ArrowLeftIcon, 
    XMarkIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export const GlobalReportLavori = ({ reports = [], cantieri = [], users = [], userRole, onBack }) => {
    
    // 1. CONTROLLO PERMESSI (Solo Titolare e Amministrazione)
    const ruoliAutorizzati = ['proprietario', 'titolare-azienda', 'amministrazione', 'superadmin'];
    const canView = ruoliAutorizzati.includes(userRole);

    // 🌟 STATI PER I FILTRI
    const [dateFilter, setDateFilter] = useState({
        start: new Date().toISOString().split('T')[0], // Default: Oggi
        end: new Date().toISOString().split('T')[0]
    });
    const [cantiereFilter, setCantiereFilter] = useState('');
    const [dipendenteFilter, setDipendenteFilter] = useState(''); // 🌟 NUOVO STATO

    const [selectedImage, setSelectedImage] = useState(null);

    // 2. ELABORAZIONE E FILTRAGGIO DATI
    const filteredReports = useMemo(() => {
        if (!canView) return [];

        // Filtriamo solo i report di tipo "Lavoro" (Inizio, Lavoro, Fine)
        let validReports = reports.filter(r => 
            r.tipologia && (
                r.tipologia.toLowerCase().includes('inizio') ||
                r.tipologia.toLowerCase().includes('lavoro') ||
                r.tipologia.toLowerCase().includes('fine')
            )
        );

        // Filtro per Cantiere
        if (cantiereFilter) {
            validReports = validReports.filter(r => r.cantiereId === cantiereFilter);
        }

        // 🌟 Filtro per Dipendente
        if (dipendenteFilter) {
            validReports = validReports.filter(r => (r.userId || r.autoreId) === dipendenteFilter);
        }

        // Filtro per Data
        if (dateFilter.start || dateFilter.end) {
            validReports = validReports.filter(r => {
                const rDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                if (isNaN(rDate)) return false;
                
                const rDateStr = rDate.toISOString().split('T')[0];
                const startStr = dateFilter.start || '1970-01-01';
                const endStr = dateFilter.end || '2099-12-31';
                
                return rDateStr >= startStr && rDateStr <= endStr;
            });
        }

        // Ordinamento: dal più recente al più vecchio
        return validReports.sort((a, b) => {
            const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dB - dA;
        });
    }, [reports, dateFilter, cantiereFilter, dipendenteFilter, canView]);

    // Helpers
    const getUserName = (uid) => {
        const u = users.find(user => user.id === uid || user.uid === uid);
        return u ? `${u.nome} ${u.cognome}` : 'Utente Sconosciuto';
    };

    const getCantiereName = (cid) => {
        const c = cantieri.find(cant => cant.id === cid);
        return c ? c.nomeCantiere : 'Cantiere Eliminato/Sconosciuto';
    };

    const getStatusStyle = (tipologia) => {
        const t = tipologia.toLowerCase();
        if (t.includes('inizio')) return 'bg-green-100 text-green-800 border-green-200';
        if (t.includes('fine')) return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-blue-100 text-blue-800 border-blue-200';
    };

    const formatDateTime = (ts) => {
        if (!ts) return 'N/D';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString('it-IT', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
    };

    if (!canView) {
        return (
            <div className="p-8 text-center bg-gray-50 min-h-screen">
                <div className="bg-white p-8 rounded-xl shadow-md max-w-md mx-auto border border-red-100">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Accesso Negato</h2>
                    <p className="text-gray-600">Non hai i permessi per visualizzare il report globale dei cantieri.</p>
                    <button onClick={onBack} className="mt-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300">Torna Indietro</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in min-h-screen">
            
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Report Globale Attività</h1>
                        <p className="text-sm text-gray-500">Monitoraggio in tempo reale di tutti i cantieri</p>
                    </div>
                </div>

                {/* Filtri */}
                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Dal</span>
                        <input type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({...prev, start: e.target.value}))} className="text-sm border-gray-300 rounded-md focus:ring-indigo-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Al</span>
                        <input type="date" value={dateFilter.end} onChange={e => setDateFilter(prev => ({...prev, end: e.target.value}))} className="text-sm border-gray-300 rounded-md focus:ring-indigo-500" />
                    </div>
                    
                    <select value={cantiereFilter} onChange={e => setCantiereFilter(e.target.value)} className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 max-w-[200px]">
                        <option value="">Tutti i Cantieri</option>
                        {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                    </select>

                    {/* 🌟 NUOVO: Menù a tendina per i Dipendenti */}
                    <select value={dipendenteFilter} onChange={e => setDipendenteFilter(e.target.value)} className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 max-w-[200px]">
                        <option value="">Tutti i Dipendenti</option>
                        {users.map(u => <option key={u.id || u.uid} value={u.id || u.uid}>{u.nome} {u.cognome}</option>)}
                    </select>

                    <button 
                        onClick={() => { 
                            setDateFilter({start:'', end:''}); 
                            setCantiereFilter(''); 
                            setDipendenteFilter(''); // 🌟 Resetta anche il dipendente
                        }} 
                        className="p-2 text-gray-400 hover:text-gray-800" 
                        title="Resetta Filtri"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Tabella Dati */}
            <div className="p-6 flex-1 overflow-auto">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 font-extrabold text-gray-500 uppercase tracking-wider">Data e Ora</th>
                                    <th className="px-6 py-4 font-extrabold text-gray-500 uppercase tracking-wider">Cantiere</th>
                                    <th className="px-6 py-4 font-extrabold text-gray-500 uppercase tracking-wider">Preposto / Tecnico</th>
                                    <th className="px-6 py-4 font-extrabold text-gray-500 uppercase tracking-wider text-center">Azione</th>
                                    <th className="px-6 py-4 font-extrabold text-gray-500 uppercase tracking-wider text-center">Posizione GPS</th>
                                    <th className="px-6 py-4 font-extrabold text-gray-500 uppercase tracking-wider text-center">Foto</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <MagnifyingGlassIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                            <p className="font-medium">Nessuna attività registrata con questi filtri.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReports.map(rep => (
                                        <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                                            
                                            {/* Data e Ora */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 font-bold text-gray-900">
                                                    <ClockIcon className="h-4 w-4 text-indigo-500" />
                                                    {formatDateTime(rep.createdAt)}
                                                </div>
                                            </td>

                                            {/* Cantiere */}
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-800 line-clamp-2">
                                                    {rep.nomeCantiere || getCantiereName(rep.cantiereId)}
                                                </span>
                                            </td>

                                            {/* Preposto */}
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">
                                                {getUserName(rep.userId || rep.autoreId)}
                                            </td>

                                            {/* Stato */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border uppercase tracking-wider ${getStatusStyle(rep.tipologia)}`}>
                                                    {rep.tipologia}
                                                </span>
                                            </td>

                                            {/* Posizione GPS */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {(rep.location || (rep.latitude && rep.longitude)) ? (
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${rep.location?.latitude || rep.latitude},${rep.location?.longitude || rep.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center gap-1 text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                                                    >
                                                        <MapPinIcon className="h-4 w-4" /> Mappa
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">-</span>
                                                )}
                                            </td>

                                            {/* Foto Anteprima */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {rep.fileUrl ? (
                                                    <button onClick={() => setSelectedImage(rep.fileUrl)} className="relative group inline-block">
                                                        <img src={rep.fileUrl} alt="Report" className="h-12 w-12 object-cover rounded-lg border border-gray-200 shadow-sm group-hover:opacity-75 transition-opacity" />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-900 drop-shadow-md" />
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div className="h-12 w-12 mx-auto rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                                                        <PhotoIcon className="h-5 w-5 text-gray-300" />
                                                    </div>
                                                )}
                                            </td>

                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modale Visualizzazione Foto Ingrandita */}
            {selectedImage && (
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl w-full">
                        <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300">
                            <XMarkIcon className="h-10 w-10" />
                        </button>
                        <img src={selectedImage} alt="Ingrandimento" className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl border-4 border-white" />
                    </div>
                </div>
            )}
            
        </div>
    );
};