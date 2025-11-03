import React, { useState } from 'react';
import { useTheme } from 'shared-ui';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
// ✅ CORREZIONE: Per la schermata di login, è più robusto importare le istanze direttamente.
// Questo evita race conditions con il context che si sta ancora inizializando.
import { auth, db } from 'shared-core'; 

export const AuthScreen = () => {
    // ❌ RIMOSSO: Non usiamo più l'hook per auth e db in questo componente specifico.
    const { primaryColor, colorClasses } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        try {
            // Ora 'auth' è sempre un'istanza valida perché importata direttamente.
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Errore di accesso:', error);
            setIsError(true);
            setMessage('Errore di accesso. Controlla le tue credenziali e riprova.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setIsError(false);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            await setDoc(doc(db, 'users', newUser.uid), {
                email: newUser.email,
                ruolo: 'proprietario',
                companyID: null,
            });

            setMessage('Registrazione completata con successo! Ora puoi accedere.');
        } catch (error) {
            console.error('Errore di registrazione:', error);
            setIsError(true);
            setMessage('Errore di registrazione. L\'utente potrebbe già esistere o la password è debole.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex items-center justify-center min-h-screen ${colorClasses[primaryColor].bg} transition-colors duration-500`}>
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm m-4 transform transition-transform duration-500 hover:scale-105">
                <h2 className={`text-4xl font-bold text-center mb-6 text-gray-800`}>Accedi</h2>
                
                <form onSubmit={handleLogin} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            // ✅ AGGIUNTO per risolvere l'avviso del browser
                            autoComplete="username"
                            className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col space-y-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 px-4 rounded-xl text-white font-semibold shadow-md transition-colors duration-200 ${
                                isLoading ? 'bg-gray-400 cursor-not-allowed' : `${colorClasses[primaryColor].bg} ${colorClasses[primaryColor].hoverBg} focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring} focus:ring-offset-2`
                            }`}
                        >
                            {isLoading ? 'Accesso in corso...' : 'Accedi'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSignup}
                            disabled={isLoading}
                            className={`w-full py-3 px-4 rounded-xl font-semibold shadow-md transition-colors duration-200 border-2 ${colorClasses[primaryColor].border} ${colorClasses[primaryColor].text} hover:bg-${primaryColor}-50 focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring} focus:ring-offset-2`}
                        >
                            Registrati
                        </button>
                    </div>
                </form>

                {message && (
                    <div className={`mt-4 p-4 rounded-xl text-center ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};