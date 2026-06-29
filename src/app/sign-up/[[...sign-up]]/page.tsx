import { SignUp } from "@clerk/nextjs";

function VerifiedCandle() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <rect x="14" y="2" width="4" height="6" rx="1" fill="#22c55e" />
      <rect x="10" y="8" width="12" height="16" rx="2" fill="#22c55e" />
      <rect x="14" y="24" width="4" height="6" rx="1" fill="#22c55e" />
      <path d="M6 12h4M22 12h4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const clerkAppearance = {
  variables: {
    colorBackground: "#111111",
    colorInputBackground: "#1a1a1a",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#9ca3af",
    colorPrimary: "#22c55e",
    colorDanger: "#ef4444",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    card: "shadow-none bg-transparent border-0 !p-0",
    headerTitle: "text-white text-xl font-bold",
    headerSubtitle: "text-gray-400 text-sm",
    socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10",
    socialButtonsBlockButtonText: "text-white font-medium",
    dividerLine: "bg-white/10",
    dividerText: "text-gray-500",
    formFieldLabel: "text-gray-400 text-xs font-medium",
    formFieldInput: "bg-[#1a1a1a] border border-white/10 text-white rounded-xl focus:border-green-500 focus:ring-0",
    formButtonPrimary: "bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl",
    footerActionLink: "text-green-400 hover:text-green-300",
    footerActionText: "text-gray-500",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-green-400",
    formResendCodeLink: "text-green-400",
    otpCodeFieldInput: "bg-[#1a1a1a] border border-white/10 text-white",
    alertText: "text-red-400",
  },
};

export default function SignUpPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-3xl" />
      </div>
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full px-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <VerifiedCandle />
          <span className="text-3xl font-black text-white tracking-tight">Ryzr</span>
          <p className="text-xs text-gray-500 tracking-widest uppercase">Social Trading Network</p>
        </div>

        {/* Clerk widget in dark card */}
        <div className="w-full max-w-sm bg-[#111111] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <SignUp appearance={clerkAppearance} />
        </div>
      </div>
    </div>
  );
}
