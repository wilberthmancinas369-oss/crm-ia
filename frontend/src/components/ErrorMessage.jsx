export default function ErrorMessage({ children }) {
  if (!children) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-red-500 font-medium mt-1 animate-fade-in">
      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {children}
    </span>
  );
}