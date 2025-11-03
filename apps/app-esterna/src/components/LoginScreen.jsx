import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { PowerIcon, UserIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/solid';

// 1. Importa il contesto LOCALE per ottenere le istanze di auth e db
import { useFirebaseData } from 'shared-core' 

export const LoginScreen = () => {
    // 2. Ottieni le istanze corrette dal contesto, già inizializzate
    const { auth, db } = useFirebaseData(); 
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');

    const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
        // ✅ CORREZIONE: Aggiungi "const result =" qui
        const result = await signInWithEmailAndPassword(auth, email, password);
        
        // Ora 'result' esiste e puoi usarlo senza errori
        console.log('✅ Login a Firebase riuscito:', result.user.email); 

    } catch (error) {
        console.error('Errore di accesso:', error);
        setLoginError('Credenziali non valide. Riprova.');
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-200">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm m-4">
                <h2 className="text-4xl font-bold text-center mb-6 text-gray-800">Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-sm text-indigo-600 hover:underline">
                            {showPassword ? "Nascondi" : "Mostra"} password
                        </button>
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl text-white font-semibold shadow-md transition-colors duration-200 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
                        >
                            {loading ? 'Accesso in corso...' : 'Accedi'}
                        </button>
                    </div>
                </form>
                {loginError && (
                    <div className="mt-4 p-4 rounded-xl text-center bg-red-100 text-red-700">
                        {loginError}
                    </div>
                )}
            </div>
        </div>
    );
};