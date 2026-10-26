import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { solicitarRecuperacion } from '../services/auth';
import ErrorMessage from '../components/ErrorMessage';

export default function ForgotPassword() {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async ({ email }) => {
    try {
      await solicitarRecuperacion(email);
      alert("Si el correo existe, recibirás un enlace para restablecer tu contraseña.");
      navigate('/login'); // Volvemos al login ya que el proceso sigue en el correo
    } catch (error) {
      setError('root.servidor', { message: 'Error al solicitar recuperación.' });
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-1">Recuperar contraseña</h1>
      <p className="text-sm text-gray-500 mb-6">Ingresa tu correo para recibir el enlace de restablecimiento.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input {...register('email', { required: 'El correo es obligatorio' })} className="w-full border rounded-md p-2" placeholder="tu@empresa.com" />
          <ErrorMessage>{errors.email?.message}</ErrorMessage>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn w-full">Enviar enlace</button>
        <p className="text-center mt-4"><a href="/login" className="text-sm text-blue-600">Volver al login</a></p>
      </form>
    </section>
  );
}