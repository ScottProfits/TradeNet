import { SignIn } from "@clerk/nextjs";
import { TrendingUp } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="relative flex items-center justify-center min-h-[90vh] overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00C896]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#00C896]/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#00C896]/5 rounded-full blur-2xl" />
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,200,150,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,200,150,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-[#00C896]" />
            <span className="text-3xl font-black text-white tracking-tight">Ryzr</span>
          </div>
          <p className="text-sm text-gray-400 tracking-widest uppercase">Social Trading Network</p>
        </div>

        {/* Clerk sign in with glass effect wrapper */}
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl" />
          <div className="relative">
            <SignIn />
          </div>
        </div>
      </div>
    </div>
  );
}
