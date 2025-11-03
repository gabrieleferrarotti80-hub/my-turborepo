import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { CameraIcon, MapPinIcon, ArrowPathIcon, UserIcon, BuildingOfficeIcon, BriefcaseIcon, WrenchScrewdriverIcon, ChartBarIcon, PowerIcon, CubeTransparentIcon, VideoCameraIcon, FolderOpenIcon, DocumentTextIcon, PlusIcon, CloudArrowUpIcon, XMarkIcon, ArrowDownTrayIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, TrashIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/solid';
import * as XLSX from 'xlsx';

// Importa solo l'hook di autenticazione
import { useAuthentication } from './useAuthentication';
import GestoreMask from './components/GestoreMask';
import TecnicoMask from './components/TecnicoMask';
import AmministratoreMask from './components/AmministratoreMask';
import { auth } from './firebaseConfig';

function App() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Utilizza il custom hook senza passare argomenti.
    // Ora gestisce solo l'autenticazione.
    const {
        currentUser,
        userRole,
        loadingAuth,
        handleLogout,
        userAziendaId
    } = useAuthentication();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLoginError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("ERRORE LOGIN: Errore durante l'accesso:", error);
            if (error.code === 'auth/network-request-failed') {
                setLoginError("Errore di rete. Controlla la tua connessione.");
            } else {
                setLoginError("Credenziali non valide o errore sconosciuto. Riprova.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            {!currentUser ? (
                <div className="login-container p-8 bg-white rounded-lg shadow-md w-96">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login</h2>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                                Email
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="email"
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                                id="password"
                                type="password"
                                placeholder="******************"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {loginError && <p className="text-red-500 text-xs italic mb-4">{loginError}</p>}
                        <div className="flex items-center justify-between">
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Accesso in corso...' : 'Accedi'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="main-content w-full h-full">
                    {userRole === 'titolare azienda' && (
                        <AmministratoreMask 
                            user={currentUser} 
                            onLogout={handleLogout} 
                            userAziendaId={userAziendaId}
                        />
                    )}
                    {(userRole === 'proprietario' || userRole === 'it' || userRole === 'admin') && (
                        <GestoreMask 
                            user={currentUser} 
                            onLogout={handleLogout} 
                            userAziendaId={userAziendaId}
                        />
                    )}
                    {userRole === 'tecnico' && (
                        <TecnicoMask 
                            user={currentUser} 
                            onLogout={handleLogout} 
                            userAziendaId={userAziendaId}
                        />
                    )}
                    {!userRole && (
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
            )}
        </div>
    );
}

export default App;
