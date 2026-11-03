import BackButton from "@/components/ui/BackButton";

// Shown in the iOS app in place of paid content (see src/lib/paidContent.ts).
// Deliberately says nothing about where else it can be bought (guideline 3.1.1).
export default function NotAvailableInApp() {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <p className="text-gray-500 text-sm text-center pt-16">This isn&apos;t available in the app.</p>
    </div>
  );
}
