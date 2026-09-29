import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { enviarInvitacion } from '../services/invitaciones';
import { listarGrupos } from '../services/grupos';
import ErrorMessage from '../components/ErrorMessage';

export default function InvitarUsuario() {
  const [email, setEmail] = useState('');
  const [groupId, setGroupId] = useState('');
  const [rol, setRol] = useState('Agente');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await listarGrupos();
        setGroups(data);
      } catch (error) {
        console.error('Error cargando grupos:', error);
        setMessage({ type: 'error', text: 'No se pudieron cargar los grupos.' });
      }
    }
    fetchGroups();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await enviarInvitacion({ email, groupId, rol });
      setMessage({ type: 'success', text: `Invitación enviada con éxito a ${email}` });
      setEmail('');
      setGroupId('');
    } catch (error) {
      console.error('Error enviando invitación:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Hubo un problema al enviar la invitación.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Invitar usuario</h1>
      
      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="group">Grupo</label>
            <select 
              id="group" 
              value={groupId} 
              onChange={(e) => setGroupId(e.target.value)} 
              required
            >
              <option value="">Selecciona un grupo</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rol">Rol</label>
            <select 
              id="rol" 
              value={rol} 
              onChange={(e) => setRol(e.target.value)} 
              required
            >
              <option value="Agente">Agente</option>
              <option value="Jefe de Área">Jefe de Área</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </button>
            <Link to="/app/grupos" className="btn-secondary">Volver a Grupos</Link>
          </div>
        </form>

        {message.text && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}
      </div>

      <style jsx>{`
        .page-container { padding: 2rem; max-width: 800px; margin: 0 auto; }
        .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .form-grid { display: grid; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-weight: 600; color: #333; }
        .form-group input, .form-group select { 
          padding: 0.75rem; 
          border: 1px solid #ccc; 
          border-radius: 4px;
          font-size: 1rem;
        }
        .form-actions { display: flex; gap: 1rem; margin-top: 1rem; }
        .btn-secondary { text-decoration: none; color: #666; display: flex; align-items: center; }
        .alert { margin-top: 1.5rem; padding: 1rem; border-radius: 4px; font-weight: 500; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
      `}</style>
    </div>
  );
}
