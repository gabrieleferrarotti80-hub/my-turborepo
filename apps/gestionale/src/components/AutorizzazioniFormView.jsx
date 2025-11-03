import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import AuthorizeFormView from './AuthorizeFormView.jsx'; // Assicurati import corretto
import { ArrowPathIcon } from '@heroicons/react/24/solid';

export const AutorizzazioniFormView = () => {
    // --- ✅ INIZIO CORREZIONE ---
 	const { data, loadingData } = useFirebaseData(); // 1. Prendi 'data'
    const forms = data?.forms || []; // 2. Estrai 'forms' da 'data'
    // --- FINE CORREZIONE ---

    const [selectedForm, setSelectedForm] = useState(null);

    // Log per debug (ora dovrebbe funzionare)
    useEffect(() => {
        if (!loadingData && forms) {
            console.log('[AutorizzazioniFormView] Dati forms:', forms);
        }
    }, [forms, loadingData]);

 	if (loadingData) {
 	 	return (
 	 	 	<div className="text-center p-8">
 	 	 	 	<ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500 mx-auto" />
 	 	 	 	<p>Caricamento form in corso...</p>
 	 	 	</div>
 	 	);
 	}

 	if (selectedForm) {
 	 	return (
 	 	 	<AuthorizeFormView
 	 	 	 	form={selectedForm}
 	 	 	 	formName={selectedForm.id} // Usa sempre l'ID come nome
 	 	 	 	onBack={() => setSelectedForm(null)}
 	 	 	 	onSaveSuccess={(message) => {
 	 	 	 	 	alert(message);
 	 	 	 	 	setSelectedForm(null);
 	 	 	 	}}
 	 	 	/>
 	 	);
 	}

 	return (
 	 	<div className="p-8">
 	 	 	<h1 className="text-3xl font-bold text-gray-800 mb-6">Elenco Moduli Disponibili</h1>
 	 	 	<p className="text-gray-600 mb-6">
 	 	 	 	Clicca su "Gestisci" per scegliere quali aziende possono visualizzare e compilare un modulo.
 	 	 	</p>
 	 	 	
 	 	 	<div className="bg-white rounded-2xl shadow-xl overflow-x-auto">
 	 	 	 	<table className="min-w-full divide-y divide-gray-200">
 	 	 	 	 	<thead className="bg-gray-50">
 	 	 	 	 	 	<tr>
 	 	 	 	 	 	 	{/* Modificato titolo colonna */}
 	 	 	 	 	 	 	<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Modulo</th>
 	 	 	 	 	 	 	<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</th>
 	 	 	 	 	 	 	<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
 	 	 	 	 	 	</tr>
 	 	 	 	 	</thead>
 	 	 	 	 	<tbody className="bg-white divide-y divide-gray-200">
                        {/* Questo .map ora funzionerà perché 'forms' è un array */}
 	 	 	 	 	 	{(forms && forms.length > 0) ? (
 	 	 	 	 	 	 	forms.map((form) => (
 	 	 	 	 	 	 	 	<tr key={form.id} className="hover:bg-gray-50">
 	 	 	 	 	 	 	 	 	{/* --- USA SEMPRE form.id --- */}
 	 	 	 	 	 	 	 	 	<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{form.id}</td>
 	 	 	 	 	 	 	 	 	{/* Mantiene il placeholder */}
 	 	 	 	 	 	 	 	 	<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
 	 	 	 	 	 	 	 	 	<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
 	 	 	 	 	 	 	 	 	 	<button onClick={() => setSelectedForm(form)} className="text-indigo-600 hover:text-indigo-900">
 	 	 	 	 	 	 	 	 	 	 	Gestisci / Modifica
 	 	 	 	 	 	 	 	 	 	</button>
 	 	 	 	 	 	 	 	 	</td>
 	 	 	 	 	 	 	 	</tr>
                            ))
 	 	 	 	 	 	) : (
 	 	 	 	 	 	 	<tr>
 	 	 	 	 	 	 	 	<td colSpan="3" className="px-6 py-4 text-center text-gray-500">
 	 	 	 	 	 	 	 	 	Nessun modulo trovato.
 	 	 	 	 	 	 	 	</td>
 	 	 	 	 	 	 	</tr>
 	 	 	 	 	 	)}
 	 	 	 	 	</tbody>
 	 	 	 	</table>
 	 	 	</div>
 	 	</div>
 	);
};