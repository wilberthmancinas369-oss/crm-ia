import React, { useState } from 'react';

/**
 * Component for creating a new group.
 * Consumes the POST /api/groups endpoint.
 */

/**
 * Componente para crear un nuevo grupo.
 * Consume el endpoint POST /api/groups.
 */
const GroupCreationForm = () => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      //Asumimos que tenemos un token de autenticación global o un servicio que maneja los encabezados
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Aquí puedes agregar la lógica para obtener el token de autenticación si es necesario
        },
        body: JSON.stringify({ 
          name: groupName, 
          description: description 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '¡Grupo creado exitosamente!' });
        setGroupName('');
        setDescription('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Ocurrió un error al crear el grupo' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Crear Nuevo Grupo</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name">Nombre del Grupo:</label>
          <input
            id="name"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            placeholder="Ej: Ventas Norte"
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="description">Descripción (Opcional):</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            placeholder="Ej: Equipo encargado de la zona norte"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '10px', 
            backgroundColor: loading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: loading ? 'not-allowed' : 'pointer' 
          }}
        >
          {loading ? 'Creando...' : 'Crear Grupo'}
        </button>
      </form>
      {message.text && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '10px', 
          borderRadius: '4px', 
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', 
          color: message.type === 'success' ? '#155724' : '#721c24' 
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default GroupCreationForm;
