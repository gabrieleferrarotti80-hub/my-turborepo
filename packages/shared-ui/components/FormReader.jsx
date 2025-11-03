import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

export const FormReader = ({
    formElements,
    formData,
    loading,
    error,
    onInputChange,
    onSubmit
}) => {
    const formHeight = formElements.reduce((max, el) => Math.max(max, (el.y || 0) + (el.height || 0)), 842) + 50;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-gray-500" />
                <span className="ml-4 text-gray-500">Caricamento modulo...</span>
            </div>
        );
    }

    if (error) {
        return <div className="p-6 text-center text-red-600">{error}</div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto bg-gray-50 rounded-lg">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Compila Modulo</h2>

            <form 
                onSubmit={onSubmit} 
                className="mx-auto bg-white rounded-md"
                style={{ 
                    position: 'relative', 
                    width: '595px',
                    minHeight: `${formHeight}px`, 
                    border: '1px solid #ccc',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
            >
                {formElements.map((element) => {
                    const styleProps = {
                        position: 'absolute',
                        top: `${element.y}px`,
                        left: `${element.x}px`,
                        width: `${element.width}px`,
                        height: `${element.height}px`,
                    };

                    switch (element.type) {
                        case 'static-text':
                            return (
                                <div key={element.id} style={styleProps} className="flex items-center">
                                    <p className="block text-sm font-medium text-gray-800">{element.content}</p>
                                </div>
                            );

                        case 'text-input':
                            return (
                                <div key={element.id} style={styleProps}>
                                    <input 
                                        type="text"
                                        name={element.id}
                                        value={formData[element.id] || ''}
                                        onChange={onInputChange}
                                        placeholder={element.placeholder || ''}
                                        className="w-full h-full text-sm p-1 border border-gray-300 rounded-sm focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            );

                        case 'textarea':
                            return (
                                <div key={element.id} style={styleProps}>
                                    <textarea
                                        name={element.id}
                                        value={formData[element.id] || ''}
                                        onChange={onInputChange}
                                        placeholder={element.placeholder || ''}
                                        className="w-full h-full text-sm p-1 border border-gray-300 rounded-sm resize-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            );
                        default:
                            return null;
                    }
                })}
                <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
                    <button type="submit" className="py-2 px-6 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700">
                        Salva
                    </button>
                </div>
            </form>
        </div>
    );
};