const LoginCredentials = () => {
  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1 border border-slate-700 shadow-lg">
        <p className="text-slate-400 text-[9px] uppercase tracking-wider">
          Evaluation Purpose
        </p>
        <p className="text-emerald-400 text-[10px]">
          Admin: admin@gmail.com / Admin123
        </p>
        <p className="text-blue-400 text-[10px]">
          User: user@gmail.com / User1234
        </p>
      </div>
    </div>
  );
};

export default LoginCredentials;
