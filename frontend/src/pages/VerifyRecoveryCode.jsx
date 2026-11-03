import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verificarCodigoRecuperacion } from '../services/auth';

export default function VerifyRecoveryCode() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Mover el foco al siguiente input automáticamente
    if (element.value !== '' && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleComplete = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      alert("Por favor, ingresa los 6 dígitos");
      return;
    }

    setLoading(true);
    try {
      await verificarCodigoRecuperacion(email, code);
      navigate('/nueva-password');
    } catch (error) {
      alert("Código incorrecto o expirado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <h1 className="text-2xl font-bold mb-1">Verifica tu identidad</h1>
      <p className="text-sm text-gray-500 mb-8 text-center">
        Ingresa el código de 6 dígitos enviado a <br/> 
        <span className="font-semibold text-gray-700">{email}</span>
      </p>
      
      <div className="flex gap-2 mb-8">
        {otp.map((data, index) => (
          <input
            key={index}
            ref={(el) => (inputsRef.current[index] = el)}
            type="text"
            maxLength="1"
            className="w-12 h-12 text-center text-xl font-bold border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            value={data}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
        ))}
      </div>

      <button 
        onClick={handleComplete} 
        disabled={loading} 
        className="btn w-full max-w-xs disabled:opacity-50"
      >
        {loading ? 'Verificando...' : 'Verificar Código'}
      </button>

      <p className="mt-6 text-sm">
        <a href="/login" className="text-blue-600 hover:underline">Cancelar y volver al login</a>
      </p>
    </section>
  );
}