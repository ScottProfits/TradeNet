// Return page for Stripe checkout / payouts opened from the iOS app's in-app
// browser. That browser isn't signed in to Ryzr, so instead of a real app page
// it lands here; tapping Done closes the sheet and the app refreshes itself.
export default function CheckoutDonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-black">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-2xl font-bold text-white">✅ All done</h1>
        <p className="text-gray-400 text-sm">
          Tap <span className="text-white font-semibold">Done</span> at the top of the screen to go back to Ryzr.
        </p>
      </div>
    </div>
  );
}
