import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { CameraIcon, MapPinIcon, ArrowPathIcon, UserIcon, BuildingOfficeIcon, BriefcaseIcon, WrenchScrewdriverIcon, ChartBarIcon, PowerIcon, CubeTransparentIcon, VideoCameraIcon, FolderOpenIcon, DocumentTextIcon, PlusIcon, CloudArrowUpIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';

// LA TUA CHIAVE API REALE E COMPLETA È STATA INSERITA QUI SOTTO.
// NON MODIFICARE QUESTA RIGA SE NON PER INCOLLARE LA CHIAVE CORRETTA DALLA TUA CONSOLE FIREBASE.
const firebaseConfig = {
    apiKey: "AIzaSyB_EdiydILfZ7S8u7E32dr3YSWaaqvZ4TM", // <--- QUESTA DEVE ESSERE ESATTAMENTE LA TUACHIAVE
    authDomain: "gestionale-cantieri-app-12345.firebaseapp.com",
    projectId: "gestionale-cantieri-app-12345",
    storageBucket: "gestionale-cantieri-app-12345.firebasestorage.app",
    messagingSenderId: "812017499241",
    appId: "1:812017499241:web:0f025fbb31eb3c2eacb6f8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, 'default');
const storage = getStorage(app);

const BACKEND_URL = 'https://backend-cantieri-812017499241-812017499241.europe-west1.run.app'; // <--- IL TUO URL DI CLOUD RUN (AGGIORNATO)

// Componente per la schermata di login
const LoginScreen = ({ onLoginSuccess, onGoToRegister, deferredInstallPrompt, onInstallPromptClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        console.log('DEBUG LOGIN: handleLogin chiamato.');
        console.log('DEBUG LOGIN: Email:', email, 'Password:', password ? '*****' : 'VUOTA');
        setError('');
        try {
            console.log('DEBUG LOGIN: Tentativo signInWithEmailAndPassword...');
            await signInWithEmailAndPassword(auth, email, password);
            console.log('DEBUG LOGIN: signInWithEmailAndPassword riuscito.');
            if (onLoginSuccess) {
                onLoginSuccess(); // Chiama la callback per indicare il successo del login
            }
        } catch (err) {
            console.error("Login error:", err.message);
            setError("Credenziali non valide. Riprova.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Accedi all'App Cantieri</h2>
                {error && <p className="text-red-600 text-center mb-4">{error}</p>}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="Inserisci la tua email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200"
                >
                    Login
                </button>
                <div className="mt-4 text-center">
                    <button
                        onClick={onGoToRegister}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                    >
                        Registrati
                    </button>
                </div>
                {deferredInstallPrompt && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={onInstallPromptClick}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5" /> Installa App
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Componente per la schermata di registrazione
const RegistrationScreen = ({ onRegistrationSuccess, onGoToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        setError('');
        setMessage('');
        if (password !== confirmPassword) {
            setError('Le password non corrispondono.');
            return;
        }
        if (password.length < 6) {
            setError('La password deve essere di almeno 6 caratteri.');
            return;
        }

        setLoading(true);
        try {
            // 1. Crea l'utente in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('DEBUG REGISTRATION: Utente creato in Firebase Auth:', user.email, 'UID:', user.uid);

            // 2. Salva le informazioni base dell'utente e un ruolo predefinito in Firestore
            // Il ruolo iniziale è 'preposto'. Il gestore potrà modificarlo manualmente in Firestore.
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: 'preposto', // Ruolo predefinito per i nuovi utenti registrati
                registrationDate: new Date().toISOString(),
                // Puoi aggiungere altri campi qui se necessario (es. nome, cognome)
            });
            console.log('DEBUG REGISTRATION: Dati utente salvati in Firestore con ruolo "preposto".');

            setMessage('Registrazione completata con successo! Ora puoi accedere.');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            // Dopo un breve ritardo, torna alla schermata di login
            setTimeout(() => {
                onRegistrationSuccess(); 
            }, 2000);

        } catch (err) {
            console.error("Registration error:", err.message);
            let errorMessage = "Errore durante la registrazione.";
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = "Questa email è già registrata. Prova ad accedere o usa un'altra email.";
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = "Formato email non valido.";
            } else if (err.code === 'auth/weak-password') {
                errorMessage = "La password è troppo debole. Deve essere di almeno 6 caratteri.";
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Registra Nuovo Utente</h2>
                {error && <p className="text-red-600 text-center mb-4">{error}</p>}
                {message && <p className="text-green-600 text-center mb-4">{message}</p>}
                
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="regEmail">
                        Email
                    </label>
                    <input
                        type="email"
                        id="regEmail"
                        className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="Inserisci la tua email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="regPassword">
                        Password
                    </label>
                    <input
                        type="password"
                        id="regPassword"
                        className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="Crea una password (min. 6 caratteri)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="confirmPassword">
                        Conferma Password
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="Conferma la password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <button
                    onClick={handleRegister}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? (
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                        <PlusIcon className="h-5 w-5" />
                    )}
                    Registra
                </button>
                <div className="mt-4 text-center">
                    <button
                        onClick={onGoToLogin}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                        disabled={loading}
                    >
                        Torna al Login
                    </button>
                </div>
            </div>
        </div>
    );
};


// Componente Modale per la visualizzazione dei documenti
const DocumentModal = ({ isOpen, onClose, documents, cantiereName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">Documenti per {cantiereName}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                {documents.length === 0 ? (
                    <p className="text-gray-600">Nessun documento disponibile per questo cantiere.</p>
                ) : (
                    <ul className="space-y-3">
                        {documents.map((doc, index) => (
                            <li key={doc.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                                <a
                                    href={doc.fileURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2 truncate"
                                    title={doc.title || doc.fileName}
                                >
                                    <DocumentTextIcon className="h-5 w-5" />
                                    {doc.title || doc.fileName}
                                </a>
                                <span className="text-sm text-gray-500 ml-2">
                                    ({(doc.fileURL.split('.').pop() || 'file').toUpperCase()})
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// Componente principale dell'App
function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [cantieriData, setCantieriData] = useState([]);
    const [loadingCantieri, setLoadingCantieri] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [selectedUserNameForCompany, setSelectedUserNameForCompany] = useState('');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [appMessage, setAppMessage] = useState('');
    const [showRegisterScreen, setShowRegisterScreen] = useState(false);
    const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null); // Stato per l'evento di installazione

    // --- Logica per il prompt di installazione PWA ---
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            // Previene la visualizzazione automatica del prompt del browser
            e.preventDefault();
            // Salva l'evento in modo da poterlo attivare in seguito
            setDeferredInstallPrompt(e);
            console.log('DEBUG PWA: beforeinstallprompt event catturato.');
        };

        const handleAppInstalled = () => {
            // Resetta il prompt dopo l'installazione
            setDeferredInstallPrompt(null);
            console.log('DEBUG PWA: App installata con successo.');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Cleanup dell'event listener
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallPromptClick = () => {
        if (deferredInstallPrompt) {
            // Mostra il prompt di installazione nativo del browser
            deferredInstallPrompt.prompt();
            // Registra la scelta dell'utente
            deferredInstallPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('DEBUG PWA: Utente ha accettato l\'installazione.');
                } else {
                    console.log('DEBUG PWA: Utente ha rifiutato l\'installazione.');
                }
                setDeferredInstallPrompt(null); // Il prompt può essere mostrato solo una volta
            });
        }
    };

    // --- Maschere per i Ruoli (Definite all'interno di App) ---

    // Maschera Preposto
    const PrepostoMask = ({ user, company, cantieriData, onLogout, selectedUserNameForCompany }) => {
        const [selectedCantiere, setSelectedCantiere] = useState('');
        const [tipologiaAzione, setTipologiaAzione] = useState('');
        const [photo, setPhoto] = useState(null);
        const [photoPreview, setPhotoPreview] = useState(null);
        const [location, setLocation] = useState(null);
        const [message, setMessage] = useState('');
        const [loading, setLoading] = useState(false);
        const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
        const [cantiereDocuments, setCantiereDocuments] = useState([]);

        const photoInputRef = useRef(null);
        const videoInputRef = useRef(null);

        const filteredCantieri = cantieriData.filter(item => {
            const match = item.azienda === company && item['ID Utente'] === user.email;
            return match;
        });
        
        const availableCantieri = [...new Set(filteredCantieri.map(item => item.cantiere))];

        useEffect(() => {
            // console.log('DEBUG PREPOSTO (useEffect): User UID ricevuto da PrepostoMask:', user?.uid);
        }, [user]);

        const triggerPhotoCapture = () => {
            if (!selectedCantiere) {
                setMessage('Selezionare prima un cantiere.');
                return;
            }
            console.log('DEBUG TRIGGER: Attivazione input file per FOTO.');
            photoInputRef.current.click();
        };

        const triggerVideoCapture = () => {
            if (!selectedCantiere) {
                setMessage('Selezionare prima un cantiere per registrare un video.');
                return;
            }
            console.log('DEBUG TRIGGER: Attivazione input file per VIDEO.');
            videoInputRef.current.click();
        };

        const handlePhotoCapture = async (e) => {
            console.log('DEBUG CAMERA: handlePhotoCapture triggered.');
            const file = e.target.files[0];
            if (file) {
                console.log('DEBUG CAMERA: File selezionato:', file.name, file.type);
                setPhoto(file);
                setPhotoPreview(URL.createObjectURL(file));
                setMessage('Foto acquisita. Tentativo di acquisire la posizione e inviare il report...');
                await handleGetLocationAndSubmitReport(file, 'photo');
            } else {
                console.log('DEBUG CAMERA: Nessun file selezionato o acquisizione annullata.');
                setMessage('Acquisizione foto annullata o nessun file selezionato.');
                // Non resettare tipologiaAzione qui, lo faremo nel finally di handleGetLocationAndSubmitReport
            }
        };

        const handleVideoCapture = async (e) => {
            console.log('DEBUG VIDEO: handleVideoCapture triggered.');
            const file = e.target.files[0];
            if (file) {
                console.log('DEBUG VIDEO: File selezionato:', file.name, file.type);
                setPhoto(file); // Reusing photo state for video preview
                setPhotoPreview(URL.createObjectURL(file));
                setMessage('Video acquisito. Tentativo di acquisire la posizione e inviare il report...');
                await handleGetLocationAndSubmitReport(file, 'video');
            } else {
                console.log('DEBUG VIDEO: Nessun file selezionato o acquisizione annullata.');
                setMessage('Acquisizione video annullata o nessun file selezionato.');
                // Non resettare tipologiaAzione qui, lo faremo nel finally di handleGetLocationAndSubmitReport
            }
        };

        const handleGetLocationAndSubmitReport = async (mediaFile, mediaType) => {
            setLoading(true);
            setMessage(`Acquisizione posizione e invio ${mediaType} in corso...`);
            console.log(`DEBUG PROCESS: Avvio processo di sottomissione per ${mediaType}.`);
            
            let currentPosition = { latitude: 0, longitude: 0 }; // Default a 0,0 se la geolocalizzazione fallisce
            let geolocationErrorMessage = '';

            try {
                console.log('DEBUG GEOLOCATION: Tentativo di acquisire la geolocalizzazione...');
                if (navigator.geolocation) {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => {
                                console.log('DEBUG GEOLOCATION: Posizione acquisita:', pos.coords.latitude, pos.coords.longitude);
                                resolve(pos);
                            },
                            (err) => {
                                console.error('DEBUG GEOLOCATION: Errore geolocalizzazione:', err);
                                reject(err);
                            },
                            { 
                                enableHighAccuracy: true, 
                                timeout: 20000, // Aumentato il timeout per robustezza
                                maximumAge: 0
                            }
                        );
                    });
                    currentPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                    setLocation(currentPosition);
                    console.log('DEBUG GEOLOCATION: Geolocalizzazione riuscita.');
                } else {
                    geolocationErrorMessage = 'La geolocalizzazione non è supportata dal tuo browser.';
                    console.warn('DEBUG GEOLOCATION: Geolocalizzazione non supportata.');
                }
            } catch (error) {
                if (error.code === error.PERMISSION_DENIED) {
                    geolocationErrorMessage = "Accesso alla geolocalizzazione negato. Concedi i permessi o riprova.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    geolocationErrorMessage = "Posizione non disponibile. Assicurati che il GPS sia attivo e riprova.";
                } else if (error.code === error.TIMEOUT) {
                    geolocationErrorMessage = "Timeout geolocalizzazione. Impossibile ottenere la posizione. Prova in un'area con segnale migliore.";
                } else {
                    geolocationErrorMessage = `Errore acquisizione posizione: ${error.message}.`;
                }
                console.error("DEBUG GEOLOCATION: Errore generale geolocalizzazione:", error);
            }

            // Aggiorna il messaggio con lo stato della geolocalizzazione prima di procedere con l'upload
            if (geolocationErrorMessage) {
                setMessage(`${geolocationErrorMessage} Procedo con l'invio del report senza posizione.`);
            } else {
                setMessage(`Posizione acquisita. Caricamento ${mediaType} in corso...`);
            }

            // Continua con l'upload anche se la geolocalizzazione è fallita o non supportata
            console.log('DEBUG UPLOAD: Avvio processo di upload media...');
            try {
                let mediaURL = '';
                if (mediaFile) {
                    if (!user || !user.uid) {
                        throw new Error(`ID utente non disponibile per l'upload. Riprova il login.`);
                    }
                    const storagePath = `reports/${user.uid}/${selectedCantiere}/${Date.now()}_${mediaFile.name}`;
                    const storageRef = ref(storage, storagePath);
                    console.log('DEBUG UPLOAD: Tentativo uploadBytes per path:', storagePath);
                    await uploadBytes(storageRef, mediaFile);
                    console.log('DEBUG UPLOAD: uploadBytes completato. Tentativo getDownloadURL...');
                    mediaURL = await getDownloadURL(storageRef);
                    console.log(`DEBUG UPLOAD: ${mediaType} uploaded:`, mediaURL);
                }

                const reportData = {
                    operatorId: user.uid || 'N/A_UID',
                    operatorEmail: user.email || 'N/A_EMAIL',
                    operatorName: selectedUserNameForCompany || 'N/A_NAME',
                    company: company || 'N/A_COMPANY',
                    cantiere: selectedCantiere || 'N/A_CANTIERE',
                    tipologia: tipologiaAzione || 'N/A_TIPOLOGIA',
                    latitude: currentPosition?.latitude || 0,
                    longitude: currentPosition?.longitude || 0,
                    mediaURL: mediaURL || '',
                    mediaType: mediaType || 'N/A_MEDIATYPE',
                    timestamp: new Date().toISOString(),
                };

                const cleanReportData = Object.fromEntries(
                    Object.entries(reportData).filter(([_, value]) => value !== undefined)
                );

                console.log('DEBUG FIRESTORE: Tentativo di salvare cleanReportData. Dati:', JSON.stringify(cleanReportData, null, 2));

                const docId = `${Date.now()}`; 
                await setDoc(doc(db, "reports", docId), cleanReportData); 
                console.log('DEBUG FIRESTORE: setDoc completato con successo su "reports" con ID:', docId);

                setMessage(`${mediaType === 'photo' ? 'Report fotografico' : 'Report video'} inviato con successo!`);
            } catch (error) {
                setMessage(`Errore invio ${mediaType}: ${error.message}`);
                console.error("DEBUG UPLOAD/FIRESTORE: Errore durante upload o scrittura Firestore:", error);
            } finally {
                setLoading(false);
                // Aggiungi un piccolo ritardo prima di resettare i campi
                setTimeout(() => {
                    setSelectedCantiere(''); 
                    setTipologiaAzione(''); 
                    setPhoto(null);
                    setPhotoPreview(null);
                    setLocation(null);
                    setMessage(''); // Resetta anche il messaggio dopo un po'
                }, 3000); // 3 secondi di ritardo
                console.log('DEBUG PROCESS: Processo completato (blocco finally).');
            }
        };

        const fetchCantiereDocuments = async () => {
            if (!selectedCantiere || !company) {
                setMessage("Selezionare un cantiere per visualizzare i documenti.");
                return;
            }
            
            setLoading(true);
            setMessage("Caricamento documenti...");
            try {
                const cantiereRecord = cantieriData.find(item => item.azienda === company && item.cantiere === selectedCantiere);
                
                if (!cantiereRecord) {
                    setMessage("Dati cantiere non trovati per la visualizzazione documenti.");
                    setLoading(false);
                    return;
                }

                const q = query(
                    collection(db, "cantiereDocuments"),
                    where("azienda", "==", company),
                    where("cantiere", "==", selectedCantiere)
                );
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCantiereDocuments(docs);
                setIsDocumentModalOpen(true);
                setMessage("");
            } catch (error) {
                console.error("Errore nel recupero documenti:", error);
                setMessage(`Errore nel recupero documenti: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        // Rimosso il vecchio useEffect per il trigger della fotocamera.
        // La logica di trigger è ora direttamente nell'onChange del select.

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 p-4 flex flex-col items-center">
                <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 md:p-8 mt-8 mb-4">
                    <div className="flex justify-end items-center mb-6">
                        <button
                            onClick={onLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-200 flex items-center gap-2"
                        >
                            <PowerIcon className="h-5 w-5" /> Logout
                        </button>
                    </div>
                    <p className="text-gray-600 mb-4 text-center text-lg">Benvenuto, <span className="font-semibold text-blue-700">{selectedUserNameForCompany}</span> di <span className="font-semibold text-blue-700">{company}</span>!</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1">
                            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="cantiere">
                                Seleziona Cantiere
                            </label>
                            <select
                                id="cantiere"
                                className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={selectedCantiere}
                                onChange={(e) => {
                                    setSelectedCantiere(e.target.value);
                                    setMessage('');
                                    setPhoto(null);
                                    setPhotoPreview(null);
                                    setLocation(null);
                                    setTipologiaAzione(''); // Reset tipologia azione when cantiere changes
                                }}
                            >
                                <option value="">Scegli un cantiere</option>
                                {availableCantieri.map(cantiere => (
                                    <option key={cantiere} value={cantiere}>{cantiere}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="azione">
                                Tipologia Azione
                            </label>
                            <select
                                id="azione"
                                className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={tipologiaAzione}
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    if (!selectedCantiere) {
                                        setMessage('Selezionare prima un cantiere.');
                                        e.target.value = ''; // Reset the select visually
                                        return;
                                    }
                                    setTipologiaAzione(selectedValue); // Update state first

                                    // Trigger camera directly from user interaction (onChange)
                                    if (selectedValue === 'Inizio Lavoro' || selectedValue === 'Lavoro' || selectedValue === 'Fine Lavoro') {
                                        console.log('DEBUG ONACTIONCHANGE: Triggering photo capture directly from select change for:', selectedValue);
                                        triggerPhotoCapture(); 
                                    }
                                    // The tipologiaAzione state will be reset to '' by handleGetLocationAndSubmitReport after successful submission.
                                    // If a video is taken, it will also be reset.
                                }}
                            >
                                <option value="">Scegli un'azione</option>
                                <option value="Inizio Lavoro">Inizio Lavoro (Foto)</option>
                                <option value="Lavoro">Lavoro (Foto)</option>
                                <option value="Fine Lavoro">Fine Lavoro (Foto)</option>
                            </select>
                        </div>

                        <input type="file" ref={photoInputRef} accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
                        <input type="file" ref={videoInputRef} accept="video/*" capture="environment" onChange={handleVideoCapture} className="hidden" />

                        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
                            <button
                                onClick={triggerVideoCapture}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={!selectedCantiere || loading}
                            >
                                <VideoCameraIcon className="h-5 w-5" /> Registra Video
                            </button>
                            
                            <button
                                onClick={fetchCantiereDocuments}
                                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={!selectedCantiere || loading}
                            >
                                <FolderOpenIcon className="h-5 w-5" /> Documenti Cantiere
                            </button>

                            {photoPreview && (
                                <div className="mt-4">
                                    <p className="text-gray-700 text-sm font-semibold mb-2">Anteprima Media:</p>
                                    {photoPreview.startsWith('blob:video') ? (
                                        <video src={photoPreview} controls className="w-full h-48 object-cover rounded-xl shadow-md" />
                                    ) : (
                                        <img src={photoPreview} alt="Anteprima" className="w-full h-48 object-cover rounded-xl shadow-md" />
                                    )}
                                </div>
                            )}
                            {location && (
                                <p className="text-gray-700 text-sm mt-2">
                                    Posizione: Latitudine {location.latitude.toFixed(4)}, Longitudine {location.longitude.toFixed(4)}
                                </p>
                            )}
                            {message && <p className="text-blue-600 text-sm mt-2">{message}</p>}
                        </div>
                    </div>
                </div>
                <DocumentModal 
                    isOpen={isDocumentModalOpen} 
                    onClose={() => setIsDocumentModalOpen(false)} 
                    documents={cantiereDocuments}
                    cantiereName={selectedCantiere}
                />
            </div>
        );
    };

    // Maschera Tecnico (Placeholder - Aggiunto tasto Documenti)
    const TecnicoMask = ({ user, company, onLogout, selectedUserNameForCompany }) => {
        const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
        const [cantiereDocuments, setCantiereDocuments] = useState([]);
        const [message, setMessage] = useState('');

        const handleOpenDocuments = async () => {
            setMessage("Funzionalità di visualizzazione documenti in fase di sviluppo. Il caricamento è riservato al Gestore.");
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-green-500 to-teal-600 p-4 flex flex-col items-center">
                <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 md:p-8 mt-8 mb-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-gray-800">Maschera Tecnico</h2>
                        <button
                            onClick={onLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-200 flex items-center gap-2"
                        >
                            <PowerIcon className="h-5 w-5" /> Logout
                        </button>
                    </div>
                    <p className="text-gray-600 mb-4">Benvenuto, <span className="font-semibold text-green-700">{selectedUserNameForCompany}</span> di <span className="font-semibold text-green-700">{company}</span>!</p>
                    <p className="text-gray-700">Qui verranno visualizzate le funzionalità specifiche per il Tecnico, come la visualizzazione dettagliata dei report e la gestione degli interventi.</p>
                    
                    <div className="mt-6 flex flex-col gap-4">
                        <button
                            onClick={handleOpenDocuments}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2"
                        >
                            <FolderOpenIcon className="h-5 w-5" /> Documenti
                        </button>
                        {message && <p className="text-blue-600 text-sm mt-2 text-center">{message}</p>}
                    </div>

                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 text-green-800 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="h-6 w-6" />
                        <span>Funzionalità Tecniche in fase di sviluppo...</span>
                    </div>
                </div>
                <DocumentModal 
                    isOpen={isDocumentModalOpen} 
                    onClose={() => setIsDocumentModalOpen(false)} 
                    documents={cantiereDocuments}
                    cantiereName="Il tuo cantiere"
                />
            </div>
        );
    };

    // Maschera Amministratore (Placeholder - Aggiunto tasto Documenti)
    const AmministratoreMask = ({ user, company, onLogout, selectedUserNameForCompany }) => {
        const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
        const [cantiereDocuments, setCantiereDocuments] = useState([]);
        const [message, setMessage] = useState('');

        const handleOpenDocuments = async () => {
            setMessage("Funzionalità di visualizzazione documenti in fase di sviluppo. Il caricamento è riservato al Gestore.");
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-orange-600 p-4 flex flex-col items-center">
                <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 md:p-8 mt-8 mb-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-gray-800">Maschera Amministratore</h2>
                        <button
                            onClick={onLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-200 flex items-center gap-2"
                        >
                            <PowerIcon className="h-5 w-5" /> Logout
                        </button>
                    </div>
                    <p className="text-gray-600 mb-4">Benvenuto, <span className="font-semibold text-orange-700">{selectedUserNameForCompany}</span> di <span className="font-semibold text-orange-700">{company}</span>!</p>
                    <p className="text-gray-700">Qui verranno visualizzate le funzionalità di gestione per la tua azienda, come la supervisione dei cantieri e degli operatori.</p>
                    
                    <div className="mt-6 flex flex-col gap-4">
                        <button
                            onClick={handleOpenDocuments}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2"
                        >
                            <FolderOpenIcon className="h-5 w-5" /> Documenti
                        </button>
                        {message && <p className="text-blue-600 text-sm mt-2 text-center">{message}</p>}
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800 flex items-center gap-2">
                        <BuildingOfficeIcon className="h-6 w-6" />
                        <span>Funzionalità Amministrative in fase di sviluppo...</span>
                    </div>
                </div>
                <DocumentModal 
                    isOpen={isDocumentModalOpen} 
                    onClose={() => setIsDocumentModalOpen(false)} 
                    documents={cantiereDocuments}
                    cantiereName="Il tuo cantiere"
                />
            </div>
        );
    };

    // Maschera Magazzino (Placeholder - Aggiunto tasto Documenti)
    const MagazzinoMask = ({ user, company, onLogout, selectedUserNameForCompany }) => {
        const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
        const [cantiereDocuments, setCantiereDocuments] = useState([]);
        const [message, setMessage] = useState('');

        const handleOpenDocuments = async () => {
            setMessage("Funzionalità di visualizzazione documenti in fase di sviluppo. Il caricamento è riservato al Gestore.");
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-500 to-slate-700 p-4 flex flex-col items-center">
                <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 md:p-8 mt-8 mb-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-gray-800">Maschera Magazzino</h2>
                        <button
                            onClick={onLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-200 flex items-center gap-2"
                        >
                            <PowerIcon className="h-5 w-5" /> Logout
                        </button>
                    </div>
                    <p className="text-gray-600 mb-4">Benvenuto, <span className="font-semibold text-slate-700">{selectedUserNameForCompany}</span> di <span className="font-semibold text-slate-700">{company}</span>!</p>
                    <p className="text-gray-700">Qui verranno visualizzate le funzionalità specifiche per la gestione del magazzino, come inventario, entrate/uscite materiali.</p>
                    
                    <div className="mt-6 flex flex-col gap-4">
                        <button
                            onClick={handleOpenDocuments}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2"
                        >
                            <FolderOpenIcon className="h-5 w-5" /> Documenti
                        </button>
                        {message && <p className="text-blue-600 text-sm mt-2 text-center">{message}</p>}
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 flex items-center gap-2">
                        <CubeTransparentIcon className="h-6 w-6" />
                        <span>Funzionalità Magazzino in fase di sviluppo...</span>
                    </div>
                </div>
                <DocumentModal 
                    isOpen={isDocumentModalOpen} 
                    onClose={() => setIsDocumentModalOpen(false)} 
                    documents={cantiereDocuments}
                    cantiereName="Il tuo cantiere"
                />
            </div>
        );
    };

    // Maschera Gestore (Super-Maschera con caricamento documenti)
    const GestoreMask = ({ user, cantieriData, onLogout }) => {
        const [activeTab, setActiveTab] = useState('overview');
        const [uploadCompany, setUploadCompany] = useState('');
        const [uploadCantiere, setUploadCantiere] = useState('');
        const [documentTitle, setDocumentTitle] = useState('');
        const [documentFile, setDocumentFile] = useState(null);
        const [uploadMessage, setUploadMessage] = useState(''); // Correttamente definito
        const [uploadLoading, setUploadLoading] = useState(false);
        const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
        const [cantiereDocuments, setCantiereDocuments] = useState([]);
        const [viewDocCantiere, setViewDocCantiere] = useState('');

        const allCompanies = [...new Set(cantieriData.map(item => item.azienda))];
        const cantieriForSelectedCompany = uploadCompany ? [...new Set(cantieriData.filter(item => item.azienda === uploadCompany).map(item => item.cantiere))] : [];
        const allCantieri = [...new Set(cantieriData.map(item => item.cantiere))];

        const handleDocumentFileChange = (e) => {
            setDocumentFile(e.target.files[0]);
        };

        const handleUploadDocument = async () => {
            if (!uploadCompany || !uploadCantiere || !documentTitle || !documentFile) {
                setUploadMessage('Per favore, compila tutti i campi e seleziona un file.');
                return;
            }

            setUploadLoading(true);
            setUploadMessage('Caricamento documento in corso...');

            try {
                const fileExtension = documentFile.name.split('.').pop();
                const storagePath = `documents/${uploadCompany}/${uploadCantiere}/${documentTitle}_${Date.now()}.${fileExtension}`;
                const storageRef = ref(storage, storagePath);
                await uploadBytes(storageRef, documentFile);
                const fileURL = await getDownloadURL(storageRef);

                const docData = {
                    azienda: uploadCompany,
                    cantiere: uploadCantiere,
                    title: documentTitle,
                    fileURL: fileURL,
                    fileName: documentFile.name,
                    mimeType: documentFile.type,
                    uploadedBy: user.email,
                    timestamp: new Date().toISOString(),
                };

                await setDoc(doc(db, "cantiereDocuments", `${uploadCompany}_${uploadCantiere}_${Date.now()}`), docData);
                setUploadMessage('Documento caricato con successo!');
                setUploadCompany('');
                setUploadCantiere('');
                setDocumentTitle('');
                setDocumentFile(null);
                if (document.getElementById('documentFileInput')) {
                    document.getElementById('documentFileInput').value = '';
                }
            } catch (error) {
                console.error("Errore caricamento documento:", error);
                setUploadMessage(`Errore caricamento documento: ${error.message}`);
            } finally {
                setUploadLoading(false);
            }
        };

        const fetchCantiereDocumentsForView = async () => {
            if (!viewDocCantiere) {
                setUploadMessage("Selezionare un cantiere per visualizzare i documenti.");
                return;
            }
            
            setUploadLoading(true); // Usa setUploadLoading qui
            setUploadMessage("Caricamento documenti...");
            try {
                const q = query(
                    collection(db, "cantiereDocuments"),
                    where("cantiere", "==", viewDocCantiere)
                );
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCantiereDocuments(docs);
                setIsDocumentModalOpen(true);
                setUploadMessage("");
            } catch (error) {
                console.error("Errore nel recupero documenti:", error);
                setUploadMessage(`Errore nel recupero documenti: ${error.message}`);
            } finally {
                setUploadLoading(false); // Usa setUploadLoading qui
            }
        };

        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-700 p-4 flex flex-col items-center">
                <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-6 md:p-8 mt-8 mb-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-gray-800">Maschera Gestore</h2>
                        <button
                            onClick={onLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-200 flex items-center gap-2"
                        >
                            <PowerIcon className="h-5 w-5" /> Logout
                        </button>
                    </div>
                    <p className="text-gray-600 mb-4">Benvenuto, <span className="font-semibold text-purple-700">{user.email}</span>!</p>

                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`${activeTab === 'overview' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200`}
                            >
                                <ChartBarIcon className="h-5 w-5 inline-block mr-2" /> Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('uploadDocuments')}
                                className={`${activeTab === 'uploadDocuments' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200`}
                            >
                                <CloudArrowUpIcon className="h-5 w-5 inline-block mr-2" /> Carica Documenti
                            </button>
                            <button
                                onClick={() => setActiveTab('viewDocuments')}
                                className={`${activeTab === 'viewDocuments' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200`}
                            >
                                <FolderOpenIcon className="h-5 w-5 inline-block mr-2" /> Visualizza Documenti
                            </button>
                        </nav>
                    </div>

                    {activeTab === 'overview' && (
                        <div>
                            <h3 className="text-2xl font-bold text-gray-700 mb-4">Panoramica Cantieri</h3>
                            <p className="text-gray-600">Qui potrai vedere una panoramica di tutti i cantieri, i loro stati e le attività recenti.</p>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cantieriData.map((cantiere, index) => (
                                    <div key={index} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
                                        <p className="font-semibold text-blue-800">{cantiere.cantiere}</p>
                                        <p className="text-sm text-blue-700">Azienda: {cantiere.azienda}</p>
                                        <p className="text-sm text-blue-700">Utente: {cantiere.utente}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'uploadDocuments' && (
                        <div>
                            <h3 className="text-2xl font-bold text-gray-700 mb-4">Carica Documenti Cantiere</h3>
                            <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-4 lg:gap-6 items-end">
                                <div className="md:col-span-1 lg:col-span-1">
                                    <label htmlFor="uploadCompany" className="block text-gray-700 text-sm font-semibold mb-2">Azienda</label>
                                    <select
                                        id="uploadCompany"
                                        className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        value={uploadCompany}
                                        onChange={(e) => { setUploadCompany(e.target.value); setUploadCantiere(''); setDocumentTitle(''); setDocumentFile(null); }}
                                    >
                                        <option value="">Seleziona Azienda</option>
                                        {allCompanies.map(company => (
                                            <option key={company} value={company}>{company}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1 lg:col-span-1">
                                    <label htmlFor="uploadCantiere" className="block text-gray-700 text-sm font-semibold mb-2">Cantiere</label>
                                    <select
                                        id="uploadCantiere"
                                        className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        value={uploadCantiere}
                                        onChange={(e) => { setUploadCantiere(e.target.value); setDocumentTitle(''); setDocumentFile(null); }}
                                        disabled={!uploadCompany}
                                    >
                                        <option value="">Seleziona Cantiere</option>
                                        {cantieriForSelectedCompany.map(cantiere => (
                                            <option key={cantiere} value={cantiere}>{cantiere}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label htmlFor="documentTitle" className="block text-gray-700 text-sm font-semibold mb-2">Titolo Documento</label>
                                    <input
                                        type="text"
                                        id="documentTitle"
                                        className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        placeholder="Es. Planimetria, Relazione Tecnica"
                                        value={documentTitle}
                                        onChange={(e) => setDocumentTitle(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label htmlFor="documentFileInput" className="block text-gray-700 text-sm font-semibold mb-2">Seleziona File</label>
                                    <input
                                        type="file"
                                        id="documentFileInput"
                                        className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                        onChange={handleDocumentFileChange}
                                    />
                                </div>
                                <div className="md:col-span-2 lg:col-span-4 flex justify-center">
                                    <button
                                        onClick={handleUploadDocument}
                                        className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                        disabled={uploadLoading || !uploadCompany || !uploadCantiere || !documentTitle || !documentFile}
                                    >
                                        {uploadLoading ? (
                                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <CloudArrowUpIcon className="h-5 w-5" />
                                        )}
                                        Carica Documento
                                    </button>
                                </div>
                                <div className="md:col-span-2 lg:col-span-4 text-center">
                                    {uploadMessage && <p className="text-blue-600 text-sm mt-2">{uploadMessage}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'viewDocuments' && (
                        <div>
                            <h3 className="text-2xl font-bold text-gray-700 mb-4 text-center">Visualizza Documenti Cantiere</h3>
                            <div className="flex flex-col items-center w-full px-4">
                                <div className="w-full max-w-sm mb-4">
                                    <label htmlFor="viewDocCantiere" className="block text-gray-700 text-sm font-semibold mb-2 text-left">Seleziona Cantiere</label>
                                    <select
                                        id="viewDocCantiere"
                                        className="shadow border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        value={viewDocCantiere}
                                        onChange={(e) => { setViewDocCantiere(e.target.value); setUploadMessage(''); }}
                                    >
                                        <option value="">Seleziona Cantiere</option>
                                        {allCantieri.map(cantiere => (
                                            <option key={cantiere} value={cantiere}>{cantiere}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={fetchCantiereDocumentsForView}
                                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                    disabled={!viewDocCantiere || uploadLoading}
                                >
                                    <FolderOpenIcon className="h-5 w-5" /> Visualizza Documenti
                                </button>
                                {uploadMessage && <p className="text-blue-600 text-sm mt-2 text-center">{uploadMessage}</p>}
                            </div>
                            <DocumentModal 
                                isOpen={isDocumentModalOpen} 
                                onClose={() => setIsDocumentModalOpen(false)} 
                                documents={cantiereDocuments}
                                cantiereName={viewDocCantiere}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };


    // Funzione per recuperare i dati dei cantieri dal backend Flask
    const fetchCantieriData = async () => {
        setLoadingCantieri(true);
        console.log('DEBUG APP (fetchCantieriData): Inizio recupero dati cantieri...');
        let rawResponseText = '';
        try {
            const urlToFetch = `${BACKEND_URL}/api/cantieri`;
            console.log('DEBUG APP (fetchCantieriData): Tentativo di recuperare i cantieri da:', urlToFetch);
            const response = await fetch(urlToFetch);

            rawResponseText = await response.text();

            if (!response.ok) {
                console.error(`DEBUG APP (fetchCantieriData): Errore HTTP! Status: ${response.status}, Testo risposta (non JSON):`, rawResponseText);
                setAppMessage(`Errore caricamento cantieri: ${response.status}. Risposta dal server: ${rawResponseText.substring(0, 200)}...`);
                throw new Error(`HTTP error! status: ${response.status}, response: ${rawResponseText}`);
            }
            
            let data;
            try {
                data = JSON.parse(rawResponseText);
                console.log('DEBUG APP (fetchCantieriData): Dati cantieri caricati dal backend:', data);
                setCantieriData(data);
                setLoadingCantieri(false);
                setAppMessage('');
            } catch (jsonError) {
                console.error(`DEBUG APP (fetchCantieriData): Errore di parsing JSON! Risposta ricevuta (non JSON):`, rawResponseText);
                setAppMessage(`Errore caricamento cantieri: Formato dati non valido. Risposta: ${rawResponseText.substring(0, 200)}...`);
                throw new Error(`JSON parsing error: ${jsonError.message}, Raw response: ${rawResponseText}`);
            }

        } catch (error) {
            console.error('DEBUG APP (fetchCantieriData): Errore generale durante il recupero dei cantieri:', error);
            const displayMessage = rawResponseText ? `Risposta: ${rawResponseText.substring(0, 200)}...` : 'Nessuna risposta dal server o errore di rete.';
            setAppMessage(`Errore caricamento cantieri: ${error.message}. ${displayMessage}`);
            setLoadingCantieri(false);
        }
    };


    // Effetto per l'autenticazione Firebase
    useEffect(() => {
        console.log('DEBUG APP (onAuthStateChanged useEffect): Inizializzazione listener onAuthStateChanged.');
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log('DEBUG APP (onAuthStateChanged callback): Callback attivata. User object:', user);
            setCurrentUser(user);
            if (user) {
                console.log('DEBUG APP (onAuthStateChanged callback): Utente autenticato rilevato:', user.email);
                console.log('DEBUG APP (onAuthStateChanged callback): User UID da auth:', user.uid);
                try {
                    // Recupera il ruolo dell'utente dalla collezione 'users' di Firestore
                    // Usiamo query per trovare il documento utente per email, poi il suo UID
                    const usersRef = collection(db, "users");
                    const q = query(usersRef, where("email", "==", user.email));
                    const querySnapshot = await getDocs(q);
                    
                    let role = 'preposto'; // Ruolo di fallback
                    let userFound = false;

                    if (!querySnapshot.empty) {
                        const userData = querySnapshot.docs[0].data();
                        role = userData.role || 'preposto';
                        userFound = true;
                        console.log('DEBUG APP (onAuthStateChanged callback): Ruolo recuperato da Firestore:', role);
                    } else {
                        console.warn('DEBUG APP (onAuthStateChanged callback): Documento utente non trovato in Firestore. Creazione con ruolo predefinito "preposto".');
                        // Se l'utente non ha un documento in 'users', creane uno con ruolo predefinito
                        // Usiamo l'UID di Firebase Auth come ID del documento Firestore per coerenza
                        await setDoc(doc(db, "users", user.uid), {
                            email: user.email,
                            role: 'preposto',
                            registrationDate: new Date().toISOString(),
                        });
                        userFound = true; // L'utente è stato ora creato in Firestore
                    }
                    setUserRole(role);
                    
                } catch (error) {
                    console.error('DEBUG APP (onAuthStateChanged callback): Errore nel recupero/creazione del ruolo da Firestore:', error);
                    setUserRole('preposto'); // Fallback in caso di errore
                }
                
                // Carica i dati dei cantieri solo una volta al login
                fetchCantieriData(); 

            } else {
                console.log('DEBUG APP (onAuthStateChanged callback): Nessun utente autenticato rilevato. Impostazione stato a disconnesso.');
                setCurrentUser(null);
                setUserRole(null);
                setSelectedCompany('');
                setSelectedUserNameForCompany('');
                setIsInitialLoad(true);
                console.log('DEBUG APP (onAuthStateChanged callback): Utente disconnesso.');
                setLoadingCantieri(false); 
            }
            setLoadingAuth(false);
            console.log('DEBUG APP (onAuthStateChanged callback): loadingAuth impostato a false.');
        });

        console.log('DEBUG APP (onAuthStateChanged useEffect): auth.currentUser al momento della configurazione listener:', auth.currentUser);

        return () => {
            console.log('DEBUG APP (onAuthStateChanged useEffect): Pulizia listener onAuthStateChanged.');
            unsubscribe();
        };
    }, []);

    // Effetto per l'auto-selezione di azienda/utente basata sui dati dei cantieri e sul ruolo
    useEffect(() => {
        console.log('DEBUG APP (useEffect auto-selezione): Stato attuale - currentUser:', currentUser?.email, 'userRole:', userRole, 'cantieriData.length:', cantieriData.length, 'isInitialLoad:', isInitialLoad);
        if (currentUser && userRole && cantieriData.length > 0 && isInitialLoad) {
            console.log('DEBUG APP (useEffect auto-selezione): Tentativo di auto-selezione avviato...');
            const userEmail = currentUser.email;
            console.log('DEBUG APP (useEffect auto-selezione): Email utente loggato:', userEmail);

            if (userRole === 'gestore' || userRole === 'amministratore' || userRole === 'magazzino') {
                setSelectedCompany('Tutte le Aziende'); // Questi ruoli possono vedere tutte le aziende o non sono legati a una specifica
                setSelectedUserNameForCompany(userEmail); // Il nome utente è la sua email per questi ruoli
                console.log(`DEBUG APP (useEffect auto-selezione): Ruolo ${userRole}: impostato accesso a tutte le aziende.`);
            } else { // Ruoli come 'preposto', 'tecnico'
                console.log('DEBUG APP (useEffect auto-selezione): Ricerca assegnazione per ruolo Preposto/Tecnico...');
                const userAssignment = cantieriData.find(item => {
                    const match = item['ID Utente'] === userEmail;
                    return match;
                });

                if (userAssignment) {
                    setSelectedCompany(userAssignment.azienda);
                    setSelectedUserNameForCompany(userAssignment.utente);
                    console.log(`DEBUG APP (useEffect auto-selezione): Ruolo ${userRole}: auto-selezionato azienda ${userAssignment.azienda} per utente ${userAssignment.utente}.`);
                } else {
                    console.log(`DEBUG APP (useEffect auto-selezione): Ruolo ${userRole}: Nessuna assegnazione trovata per l'utente ${userEmail} in cantieriData. Impostazione a vuoto.`);
                    setSelectedCompany('');
                    setSelectedUserNameForCompany('');
                    setAppMessage(`Attenzione: Nessuna assegnazione cantiere trovata per l'utente ${userEmail}. Contatta il gestore.`);
                }
            }
            setIsInitialLoad(false); 
            console.log('DEBUG APP (useEffect auto-selezione): Auto-selezione completata. selectedCompany:', selectedCompany, 'selectedUserNameForCompany:', selectedUserNameForCompany);
        } else if (currentUser && userRole && !isInitialLoad && cantieriData.length === 0) {
            console.log('DEBUG APP (useEffect auto-selezione): Dati cantieri non disponibili o già caricati, ma non trovati per utente.');
        } else {
            console.log('DEBUG APP (useEffect auto-selezione): Condizioni per auto-selezione non soddisfatte.');
        }
    }, [currentUser, userRole, cantieriData, isInitialLoad]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log('Logout effettuato con successo.');
        } catch (error) {
            console.error("Errore durante il logout:", error);
        }
    };

    // --- LOGICA DI RENDERING ---
    // 1. Mostra spinner se l'autenticazione è ancora in corso
    if (loadingAuth) { 
        console.log('DEBUG APP (Render): Mostro schermata di caricamento autenticazione.');
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin" />
                    <p className="mt-4 text-lg text-gray-700">Caricamento autenticazione...</p>
                </div>
            </div>
        );
    }

    // 2. Se l'autenticazione è completata e non c'è un utente, mostra la schermata di login o registrazione
    if (!currentUser) {
        console.log('DEBUG APP (Render): Nessun utente autenticato. Mostro schermata di login o registrazione.');
        return showRegisterScreen ? (
            <RegistrationScreen 
                onRegistrationSuccess={() => setShowRegisterScreen(false)} 
                onGoToLogin={() => setShowRegisterScreen(false)} 
            />
        ) : (
            <LoginScreen 
                onLoginSuccess={() => {
                    setLoadingAuth(true); // Forziamo un ricaricamento completo dello stato di autenticazione dopo il login
                    setIsInitialLoad(true); // E anche l'auto-selezione
                }} 
                onGoToRegister={() => setShowRegisterScreen(true)} 
                deferredInstallPrompt={deferredInstallPrompt} // Passa il prompt
                onInstallPromptClick={handleInstallPromptClick} // Passa la funzione per attivare il prompt
            />
        );
    }

    // 3. Se l'utente è loggato ma i dati dei cantieri sono ancora in caricamento
    if (loadingCantieri) {
        console.log('DEBUG APP (Render): Mostro schermata di caricamento dati cantieri.');
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin" />
                    <p className="mt-4 text-lg text-gray-700">Caricamento dati cantieri...</p>
                </div>
            </div>
        );
    }

    // 4. Se tutto è caricato e l'utente è autenticato, mostra la maschera appropriata
    console.log('DEBUG APP (Render): Utente autenticato e dati caricati. Rendering maschera per ruolo:', userRole);
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
            {/* Messaggio di avviso generale dell'app */}
            {appMessage && (
                <div className="w-full max-w-4xl bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-xl relative mb-4" role="alert">
                    <strong className="font-bold">Attenzione!</strong>
                    <span className="block sm:inline"> {appMessage}</span>
                    <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <XMarkIcon className="fill-current h-6 w-6 text-yellow-500 cursor-pointer" onClick={() => setAppMessage('')} />
                    </span>
                </div>
            )}

            {/* Non c'è più il selettore del ruolo manuale */}
            {userRole === 'preposto' && (
                <PrepostoMask 
                    user={currentUser} 
                    company={selectedCompany} 
                    cantieriData={cantieriData} 
                    onLogout={handleLogout} 
                    selectedUserNameForCompany={selectedUserNameForCompany} 
                />
            )}
            {userRole === 'gestore' && (
                <GestoreMask 
                    user={currentUser} 
                    cantieriData={cantieriData} 
                    onLogout={handleLogout} 
                />
            )}
            {userRole === 'tecnico' && (
                <TecnicoMask 
                    user={currentUser} 
                    company={selectedCompany} 
                    onLogout={handleLogout} 
                    selectedUserNameForCompany={selectedUserNameForCompany} 
                />
            )}
            {userRole === 'amministratore' && (
                <AmministratoreMask 
                    user={currentUser} 
                    company={selectedCompany} 
                    onLogout={handleLogout} 
                    selectedUserNameForCompany={selectedUserNameForCompany} 
                />
            )}
            {userRole === 'magazzino' && (
                <MagazzinoMask 
                    user={currentUser} 
                    company={selectedCompany} 
                    onLogout={handleLogout} 
                    selectedUserNameForCompany={selectedUserNameForCompany} 
                />
            )}
            {/* Se per qualche motivo il ruolo non è definito dopo il login */}
            {!userRole && !loadingAuth && (
                <div className="mt-8 p-6 bg-red-100 rounded-xl shadow-md text-red-800 text-center">
                    <p>Impossibile determinare il tuo ruolo. Contatta l'amministratore.</p>
                    <button
                        onClick={handleLogout}
                        className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 mx-auto"
                    >
                        <PowerIcon className="h-5 w-5" /> Logout
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
