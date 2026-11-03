import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { actualizarPassword } from '../services/auth';

export default function ResetPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async ({ password }) => {
    try {
      await actualizarPassword(password);
      alert("Contraseña actualizada con éxito");
      navigate('/login');
    } catch (error) {
      alert("Error al actualizar contraseña");
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-1">Nueva contraseña</h1>
      <p className="text-sm text-gray-500 mb-6">Crea una contraseña segura.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input {...register('password', { required: 'Obligatorio', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })} type="password" className="w-full border rounded-md p-2" placeholder="Nueva contraseña" />
        <button type="submit" disabled={isSubmitting} className="btn w-full">Cambiar contraseña</button>
      </form>
    </section>
  );
}