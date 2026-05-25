import { useState } from "react";
import { billing } from "../api";

export function UpgradePage({
  onClose,
  reason,
}: {
  onClose: () => void;
  reason?: string;
}) {
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponError("");
    setCouponChecking(true);
    try {
      const result = await billing.validateCoupon(code);
      if (result.valid) {
        setAppliedCoupon({ code, description: result.description });
        setCouponInput("");
      } else {
        setCouponError("Invalid or expired coupon code");
      }
    } catch {
      setCouponError("Could not check coupon — try again");
    } finally {
      setCouponChecking(false);
    }
  }

  async function startCheckout(plan: "monthly" | "annual") {
    setLoading(plan);
    try {
      const { url } = await billing.checkout(plan, appliedCoupon?.code);
      window.location.href = url;
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-800 border border-surface-500 rounded-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-surface-500">
          <h2 className="text-white font-semibold text-base">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            className="btn-ghost text-gray-400 hover:text-white p-1"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {reason && (
            <p className="text-yellow-400 text-sm bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
              {reason}
            </p>
          )}

          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Unlimited tags
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Priority support
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> 14-day free trial — cancel
              anytime
            </div>
          </div>

          {/* Coupon */}
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-green-400/10 border border-green-400/30 rounded-lg px-3 py-2">
              <div>
                <p className="text-green-400 text-xs font-semibold uppercase tracking-wide">
                  Coupon applied
                </p>
                <p className="text-gray-300 text-sm">
                  {appliedCoupon.description}
                </p>
              </div>
              <button
                className="text-gray-500 hover:text-gray-300 text-xs ml-3"
                onClick={() => setAppliedCoupon(null)}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    setCouponError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void applyCoupon()}
                  placeholder="Coupon code"
                  className="input flex-1 text-sm"
                />
                <button
                  className="btn-ghost text-sm border border-surface-400 px-3 py-1.5 disabled:opacity-40"
                  onClick={() => void applyCoupon()}
                  disabled={couponChecking || !couponInput.trim()}
                >
                  {couponChecking ? "…" : "Apply"}
                </button>
              </div>
              {couponError && (
                <p className="text-danger text-xs">{couponError}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              className="flex flex-col items-center p-4 border border-surface-400 rounded-lg hover:border-accent transition-colors"
              onClick={() => startCheckout("monthly")}
              disabled={loading !== null}
            >
              <span className="text-white font-semibold text-lg">€5</span>
              <span className="text-gray-400 text-xs">per month</span>
              {loading === "monthly" && (
                <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin mt-1" />
              )}
            </button>

            <button
              className="flex flex-col items-center p-4 border border-accent rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors relative"
              onClick={() => startCheckout("annual")}
              disabled={loading !== null}
            >
              <span className="absolute -top-2 right-2 bg-accent text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                Save 25%
              </span>
              <span className="text-white font-semibold text-lg">€45</span>
              <span className="text-gray-400 text-xs">per year</span>
              {loading === "annual" && (
                <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin mt-1" />
              )}
            </button>
          </div>

          <p className="text-gray-500 text-xs text-center">
            Pay by card, SEPA direct debit, or PayPal. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
