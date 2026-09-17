import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
    useFirebaseData, 
    usePresenzeManager, 
    useDDTManager, 
    useMagazzinoManager, 
    useHRManager, 
    useSicurezzaManager 
} from 'shared-core'; // 🌟 Rimosso 'db' falso
import { 
    PresenzeControllo, 
    PresenzeViewerModal, 
    DDTCaptureModal, 
    RichiestaFerieModal, 
    SignatureModal,
    BugReportModal
} from 'shared-ui';
import { 
    TruckIcon, 
    CalendarDaysIcon, 
    ShieldCheckIcon, 
    BellAlertIcon,
    MegaphoneIcon,
    ArrowRightOnRectangleIcon,
    XMarkIcon,
    FaceFrownIcon,
    PlusCircleIcon,
    CloudIcon
} from '@heroicons/react/24/solid';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'; 

export const MaskLayout = ({ children, user, userData, data, onLogout, title, subtitle, className }) => {

    const [statusMessage, setStatusMessage] = useState('');
    const [isPresenzeModalOpen, setIsPresenzeModalOpen] = useState(false);
    const [isDDTModalOpen, setIsDDTModalOpen] = useState(false); 
    const [isBachecaOpen, setIsBachecaOpen] = useState(false); 
    const [isNotificheOpen, setIsNotificheOpen] = useState(false); 
    const [isAssenzeMenuOpen, setIsAssenzeMenuOpen] = useState(false); 
    const [isFerieModalOpen, setIsFerieModalOpen] = useState(false);
    const [segnalazioneType, setSegnalazioneType] = useState(null); 
    const [dpiToSign, setDpiToSign] = useState(null); 

    // 🌟 LA MAGIA: db viene estratto sicuro dal contesto!
    const { db, loadingData, storage } = useFirebaseData();
    const userPresenze = data?.userPresenze || []; 
    const ordiniList = data?.ordini_acquisto || [];
    const ddtList = data?.ddt_acquisti || [];

    const mieNotificheNonLette = useMemo(() => {
        if (!data?.notifiche) return [];
        return data.notifiche.filter(n => n.letta === false && n.destinatario !== 'tutti' && n.tipo !== 'bacheca');
    }, [data?.notifiche]);

    const [notificheGenerali, setNotificheGenerali] = useState([]);
    
    useEffect(() => {
        // 🌟 TORNATO IL CONTROLLO SALVAVITA: Se db è undefined, non fa schiantare la pagina!
        if (!db || !userData?.companyID) return;
        
        const qBacheca = query(collection(db, 'notifiche'), where('companyID', '==', userData.companyID), where('destinatario', '==', 'tutti'));
        
        const unsub = onSnapshot(qBacheca, (snapshot) => {
            const globali = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
            globali.sort((a, b) => {
                const dateA = a.data?.toDate ? a.data.toDate() : new Date(a.data || 0);
                const dateB = b.data?.toDate ? b.data.toDate() : new Date(b.data || 0);
                return dateB - dateA;
            });
            setNotificheGenerali(globali);
        });
        return () => unsub();
    }, [db, userData?.companyID]);

    const handleSegnaNotificaLetta = async (notificaId) => {
        try { await updateDoc(doc(db, 'notifiche', notificaId), { letta: true }); } 
        catch (error) { console.error("Errore aggiornamento notifica:", error); }
    };

    const { isSaving, checkIn, checkOut, segnalaMalattia, segnalaInfortunio, segnalaPioggia, segnalaErrore } = usePresenzeManager(db, user, userData?.companyID);
    const { uploadDDT, isUploading: isDDTUploading } = useDDTManager(db, storage, user, userData?.companyID);
    const { processaDDT } = useMagazzinoManager(db, storage, user, userData?.companyID);
    const { inviaRichiestaFerie, isLoading: isHRLoading } = useHRManager(db, user, userData?.companyID);
    const { confermaRicezioneDPI } = useSicurezzaManager(db, storage, user, userData?.companyID);

    const rawStatoCorrente = data?.statoCorrente || null;
    const statoCorrente = useMemo(() => {
        if (!rawStatoCorrente) return null;
        if (rawStatoCorrente.timestampFine) return null;
        if (!rawStatoCorrente.timestampFine && !rawStatoCorrente.stato) return { ...rawStatoCorrente, stato: 'lavoro' };
        return rawStatoCorrente;
    }, [rawStatoCorrente]);

    const mieRichiesteFerie = useMemo(() => {
        if (!data?.richieste_ferie || !user) return [];
        return data.richieste_ferie.filter(r => r.userId === (user.uid || user.id));
    }, [data?.richieste_ferie, user]);

    const dpiDaFirmare = useMemo(() => {
        if (!data?.assegnazioniMagazzino || !user) return [];
        return data.assegnazioniMagazzino.filter(item => {
            const stato = (item.statoWorkflow || item.stato || '').toLowerCase();
            return item.assegnatoA === (user.uid || user.id) && 
                   (item.categoria === 'DPI' || item.isDPI === true) &&
                   !item.confermaRicezione && stato !== 'conclusa' && stato !== 'dismessa';
        });
    }, [data?.assegnazioniMagazzino, user]);

    const handleCheckIn = useCallback(async () => {
        const result = await checkIn();
        if (!result.success) setStatusMessage(result.message || "Errore check-in");
    }, [checkIn]);

    const handleCheckOut = useCallback(async () => {
        if (!statoCorrente?.id) return setStatusMessage("Errore: Stato corrente non trovato.");
        const result = await checkOut(statoCorrente.id);
        if (!result.success) setStatusMessage(result.message || "Errore check-out");
    }, [checkOut, statoCorrente]);

    const handleSegnalaMalattia = useCallback(async (start, end, note) => {
        const res = await segnalaMalattia(start, end, note);
        setStatusMessage(res.message || (res.success ? "Malattia registrata." : "Errore"));
    }, [segnalaMalattia]);

    const handleSegnalaInfortunio = useCallback(async (start, end, note) => {
        const res = await segnalaInfortunio(start, end, note);
        setStatusMessage(res.message || (res.success ? "Infortunio registrato." : "Errore"));
    }, [segnalaInfortunio]);

    const handleSegnalaPioggia = useCallback(async () => {
        const note = prompt("Aggiungi una nota per il maltempo (opzionale):");
        if (note === null) return;
        const res = await segnalaPioggia(note);
        setStatusMessage(res.message || (res.success ? "Maltempo registrato." : "Errore"));
    }, [segnalaPioggia]);

    const handleSegnalaErrorePresenza = useCallback(async (nota, dataRif) => {
        const res = await segnalaErrore(nota, dataRif);
        setStatusMessage(res.message || (res.success ? "Segnalazione inviata." : "Errore"));
        return res;
    }, [segnalaErrore]);

    const handleSaveDDT = async (dati, file) => {
        const result = await uploadDDT(file, dati);
        if (!result.success) return setStatusMessage("Errore DDT: " + result.message);
        if (dati.ordineId) {
            const ordine = ordiniList.find(o => o.id === dati.ordineId);
            if (ordine) {
                setStatusMessage("Caricamento magazzino...");
                const resProcess = await processaDDT({ id: result.id, ...dati }, ordine);
                if (resProcess.success) setStatusMessage("✅ DDT Inviato e Materiale Caricato!");
                else setStatusMessage("⚠️ DDT salvato, errore carico: " + resProcess.message);
            } else setStatusMessage("✅ DDT Inviato (Ordine non trovato)");
        } else setStatusMessage("✅ DDT Inviato!");
        setIsDDTModalOpen(false);
    };

    const handleSaveFerie = async (dati) => {
        const result = await inviaRichiestaFerie(dati);
        if (result.success) {
            setStatusMessage("Ferie inviate!");
            setIsFerieModalOpen(false);
        } else setStatusMessage("Errore: " + result.message);
    };

    const handleConfirmDPI = async (blobFirma) => {
        if (!dpiToSign) return;
        const result = await confermaRicezioneDPI(dpiToSign.id, blobFirma);
        if (result.success) {
            setStatusMessage("✅ Firma salvata!");
            setDpiToSign(null); 
        } else setStatusMessage("Errore: " + result.message);
    };

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    return (
        <div className={`h-[100dvh] w-full flex flex-col bg-gray-50 overflow-hidden ${className || ''}`}>
            
            <header className="flex justify-between items-center px-4 py-3 bg-white shadow-sm z-20 shrink-0">
                <div className="flex flex-col min-w-0 flex-1">
                    <h1 className="text-xl font-black text-gray-900 truncate">{title}</h1>
                    {subtitle && <p className="text-xs font-medium text-gray-500 truncate">{subtitle}</p>}
                </div>

                {user && (
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                        
                        {dpiDaFirmare.length > 0 && (
                            <button onClick={() => setDpiToSign(dpiDaFirmare[0])} className="bg-red-50 text-red-600 p-2 rounded-full animate-pulse border border-red-200">
                                <ShieldCheckIcon className="h-5 w-5"/> 
                            </button>
                        )}
                        
                        <button onClick={() => setIsNotificheOpen(true)} className="relative p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                            <BellAlertIcon className="h-5 w-5" />
                            {mieNotificheNonLette.length > 0 && <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                        </button>

                        <button onClick={() => setIsBachecaOpen(true)} className="relative p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors">
                            <MegaphoneIcon className="h-5 w-5" />
                            {notificheGenerali.length > 0 && <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-indigo-500 rounded-full border-2 border-white"></span>}
                        </button>

                        <button onClick={() => setIsAssenzeMenuOpen(true)} className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                            <CalendarDaysIcon className="h-5 w-5" />
                        </button>
                        
                        <div className="text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center">
                            <BugReportModal layout="icon_only" fonte="app_mobile" />
                        </div>

                        <button onClick={onLogout} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition-colors">
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </header>

            {!loadingData && (
                <div className="bg-white border-b border-gray-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] z-10 shrink-0">
                    <PresenzeControllo 
                        statoCorrente={statoCorrente}
                        onCheckIn={handleCheckIn}
                        onCheckOut={handleCheckOut}
                        isSaving={isSaving}
                        onViewPresenzeClick={() => setIsPresenzeModalOpen(true)}
                    />
                </div>
            )}
            
            <main className="flex-1 overflow-y-auto w-full relative z-0">
                {children}
            </main>

            <button
                onClick={() => setIsDDTModalOpen(true)}
                className="absolute bottom-24 right-4 z-30 bg-indigo-600 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-transform border-2 border-indigo-400/50"
            >
                <TruckIcon className="h-7 w-7" />
            </button>

            {isNotificheOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
                    <div className="bg-gray-50 w-full max-h-[85vh] rounded-t-3xl shadow-2xl flex flex-col animate-slide-up">
                        <div className="p-5 border-b border-gray-200 bg-white rounded-t-3xl flex justify-between items-center sticky top-0">
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <BellAlertIcon className="h-6 w-6 text-blue-600" /> Le tue Notifiche
                            </h2>
                            <button onClick={() => setIsNotificheOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 space-y-4">
                            {mieNotificheNonLette.length > 0 ? (
                                mieNotificheNonLette.map(notifica => (
                                    <div key={notifica.id} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 border-l-4 border-l-blue-500">
                                        <h3 className="text-base font-black text-gray-900 leading-tight mb-2">{notifica.titolo}</h3>
                                        <p className="text-sm text-gray-600 mb-3">{notifica.messaggio}</p>
                                        <button onClick={() => handleSegnaNotificaLetta(notifica.id)} className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors">
                                            Segna come letto
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <BellAlertIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Non hai nuove notifiche personali.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isBachecaOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
                    <div className="bg-gray-50 w-full max-h-[85vh] rounded-t-3xl shadow-2xl flex flex-col animate-slide-up">
                        <div className="p-5 border-b border-gray-200 bg-white rounded-t-3xl flex justify-between items-center sticky top-0">
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <MegaphoneIcon className="h-6 w-6 text-indigo-600" /> Bacheca Aziendale
                            </h2>
                            <button onClick={() => setIsBachecaOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1 space-y-4">
                            {notificheGenerali.length > 0 ? (
                                notificheGenerali.map(com => (
                                    <div key={com.id} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 border-l-4 border-l-indigo-500">
                                        <p className="text-xs font-bold text-indigo-500 mb-1">{com.data?.toDate ? com.data.toDate().toLocaleDateString() : 'Avviso'}</p>
                                        <h3 className="text-base font-black text-gray-900 leading-tight mb-2">{com.titolo}</h3>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{com.messaggio}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <MegaphoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Nessuna comunicazione recente in bacheca.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isAssenzeMenuOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
                    <div className="bg-gray-50 w-full rounded-t-3xl shadow-2xl flex flex-col animate-slide-up">
                        <div className="p-5 border-b border-gray-200 bg-white rounded-t-3xl flex justify-between items-center">
                            <h2 className="text-xl font-black text-gray-900">Assenze e Segnalazioni</h2>
                            <button onClick={() => setIsAssenzeMenuOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3 pb-safe">
                            <button onClick={() => { setIsAssenzeMenuOpen(false); setIsFerieModalOpen(true); }} className="w-full bg-white border border-gray-200 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform shadow-sm">
                                <div className="bg-blue-100 p-3 rounded-xl"><CalendarDaysIcon className="h-6 w-6 text-blue-600"/></div>
                                <div className="text-left">
                                    <span className="block font-bold text-gray-900">Ferie e Permessi</span>
                                    <span className="block text-xs text-gray-500">Programma un'assenza futura</span>
                                </div>
                            </button>
                            
                            <button onClick={() => { setIsAssenzeMenuOpen(false); setSegnalazioneType('malattia'); }} className="w-full bg-white border border-gray-200 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform shadow-sm">
                                <div className="bg-orange-100 p-3 rounded-xl"><FaceFrownIcon className="h-6 w-6 text-orange-600"/></div>
                                <div className="text-left">
                                    <span className="block font-bold text-gray-900">Segnala Malattia</span>
                                    <span className="block text-xs text-gray-500">Comunica un'assenza per salute</span>
                                </div>
                            </button>
                            
                            <button onClick={() => { setIsAssenzeMenuOpen(false); setSegnalazioneType('infortunio'); }} className="w-full bg-white border border-gray-200 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform shadow-sm">
                                <div className="bg-red-100 p-3 rounded-xl"><PlusCircleIcon className="h-6 w-6 text-red-600"/></div>
                                <div className="text-left">
                                    <span className="block font-bold text-gray-900">Segnala Infortunio</span>
                                    <span className="block text-xs text-gray-500">Infortunio sul posto di lavoro</span>
                                </div>
                            </button>
                            
                            <button onClick={() => { setIsAssenzeMenuOpen(false); handleSegnalaPioggia(); }} className="w-full bg-white border border-gray-200 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform shadow-sm">
                                <div className="bg-cyan-100 p-3 rounded-xl"><CloudIcon className="h-6 w-6 text-cyan-600"/></div>
                                <div className="text-left">
                                    <span className="block font-bold text-gray-900">Sospensione Maltempo</span>
                                    <span className="block text-xs text-gray-500">Sospendi i lavori per pioggia</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {segnalazioneType && (
                <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
                        <h3 className="text-xl font-black mb-1 capitalize text-gray-900">Segnala {segnalazioneType}</h3>
                        <p className="text-xs text-gray-500 mb-5">Inserisci le date di inizio e fine presunta.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Dal (Primo giorno)</label>
                                <input type="date" id="segDal" className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl p-3 mt-1 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Al (Ultimo giorno presunto)</label>
                                <input type="date" id="segAl" className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl p-3 mt-1 focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Note (Opzionale)</label>
                                <textarea id="segNote" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 mt-1 focus:ring-2 focus:ring-indigo-500" rows="2"></textarea>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setSegnalazioneType(null)} className="flex-1 p-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors">Annulla</button>
                            <button onClick={() => {
                                const start = document.getElementById('segDal').value;
                                const end = document.getElementById('segAl').value;
                                const note = document.getElementById('segNote').value;
                                if(!start) return alert("Inserisci almeno la data di inizio.");
                                
                                const startDate = new Date(start);
                                const endDate = end ? new Date(end) : null;

                                if (segnalazioneType === 'malattia') handleSegnalaMalattia(startDate, endDate, note);
                                else handleSegnalaInfortunio(startDate, endDate, note);
                                setSegnalazioneType(null);
                            }} className="flex-1 p-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-white transition-colors shadow-md">Invia All'Ufficio</button>
                        </div>
                    </div>
                </div>
            )}

            {statusMessage && (
                <div key={Date.now()} className="fixed top-4 left-4 right-4 z-[10000] p-4 text-sm font-bold text-center text-white bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl animate-fade-in-down" onAnimationEnd={() => setTimeout(() => setStatusMessage(''), 3000)}>
                    {statusMessage}
                </div>
            )}

            <div className="relative z-[9999]">
                <PresenzeViewerModal 
                    isOpen={isPresenzeModalOpen}
                    onClose={() => setIsPresenzeModalOpen(false)}
                    presenze={userPresenze}
                    onSegnalaErrore={handleSegnalaErrorePresenza} 
                    isSaving={isSaving}
                />
                <DDTCaptureModal 
                    isOpen={isDDTModalOpen}
                    onClose={() => setIsDDTModalOpen(false)}
                    cantieri={data?.cantieriAssegnati || data?.cantieri || []} 
                    ordini={ordiniList}
                    ddtList={ddtList}
                    onSave={handleSaveDDT}
                    isUploading={isDDTUploading}
                />
                <RichiestaFerieModal 
                    isOpen={isFerieModalOpen}
                    onClose={() => setIsFerieModalOpen(false)}
                    onSave={handleSaveFerie}
                    isSending={isHRLoading}
                    mieRichieste={mieRichiesteFerie} 
                />
                <SignatureModal 
                    isOpen={!!dpiToSign} 
                    onClose={() => setDpiToSign(null)}
                    onConfirm={handleConfirmDPI}
                    itemName={dpiToSign?.articoloNome || "DPI Selezionato"}
                />
            </div>

        </div>
    );
};