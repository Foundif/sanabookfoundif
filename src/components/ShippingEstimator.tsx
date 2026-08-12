import { useState } from "react";
import { Check, Clock, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/shopify";
import {
  deliveryWindowLabel,
  dispatchNote,
  isValidPincode,
  shippingOptions,
  zoneForPincode,
  type ShippingMethodId,
} from "@/lib/shipping";

interface Props {
  subtotal: number;
  /** Compact variant is used inside the cart drawer. */
  compact?: boolean;
  onSelect?: (method: ShippingMethodId, total: number) => void;
}

export function ShippingEstimator({ subtotal, compact = false, onSelect }: Props) {
  const [pincode, setPincode] = useState("");
  const [checked, setChecked] = useState("");
  const [method, setMethod] = useState<ShippingMethodId>("standard");

  const zone = checked ? zoneForPincode(checked) : null;
  const options = checked ? shippingOptions(checked, subtotal) : [];
  const selected = options.find((o) => o.id === method) ?? options[0];

  const check = () => {
    if (!isValidPincode(pincode)) return;
    setChecked(pincode);
    setMethod("standard");
    const opts = shippingOptions(pincode, subtotal);
    if (opts[0]) onSelect?.(opts[0].id, subtotal + opts[0].price);
  };

  return (
    <div className={compact ? "" : "rounded-xl border border-border bg-card p-4"}>
      <p className="eyebrow flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" /> Delivery &amp; shipping options
      </p>

      <div className="mt-3 flex gap-2">
        <Input
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setChecked("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              check();
            }
          }}
          placeholder="Enter 6-digit pincode"
          inputMode="numeric"
          aria-label="Delivery pincode"
        />
        <Button variant="secondary" onClick={check} disabled={!isValidPincode(pincode)}>
          Check
        </Button>
      </div>

      {pincode.length === 6 && !isValidPincode(pincode) && (
        <p className="mt-2 text-xs text-destructive">Please enter a valid Indian pincode.</p>
      )}

      {zone && selected && (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-leaf">
            <Check className="h-3.5 w-3.5" /> Delivering to {checked} · {zone.label}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {dispatchNote()} · Sundays excluded
          </p>

          <div className="mt-2 grid gap-2">
            {options.map((o) => (
              <label
                key={o.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selected.id === o.id ? "border-primary bg-accent" : "border-border bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="shipping-method"
                  className="mt-1 accent-[var(--color-primary)]"
                  checked={selected.id === o.id}
                  onChange={() => {
                    setMethod(o.id);
                    onSelect?.(o.id, subtotal + o.price);
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{o.label}</span>
                    <span className="text-sm font-bold">
                      {o.free ? "Free" : formatINR(o.price)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{o.note}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Truck className="h-3.5 w-3.5" /> Arrives {o.etaLabel}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {!zone.cod && (
            <p className="text-xs text-muted-foreground">
              Cash on delivery is not available for this pincode — prepaid orders only.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Estimated arrival {deliveryWindowLabel(selected.window)} for orders placed today.
          </p>
        </div>
      )}
    </div>
  );
}
