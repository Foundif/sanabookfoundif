import { Link } from "@tanstack/react-router";
import logo from "@/assets/sanabooks-logo.png";
import { AGE_GROUPS, CATEGORIES } from "@/lib/shopify";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Sanabooks India logo"
              className="h-10 w-10 rounded-full bg-cream object-contain"
            />
            <span className="text-base font-bold">Sanabooks India</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed opacity-80">
            A curated children's bookshop for Indian families. Same hand-picked catalogue as
            Sanabooks Singapore, now shipping pan-India.
          </p>
          <p className="mt-4 text-xs opacity-70">
            INR pricing inclusive of taxes · GST invoicing available
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-[0.14em] uppercase opacity-70">Shop by age</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {AGE_GROUPS.map((a) => (
              <li key={a.tag}>
                <Link to="/shop" search={{ age: a.tag }} className="opacity-85 hover:opacity-100">
                  {a.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-[0.14em] uppercase opacity-70">Categories</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link to="/shop" search={{ category: c }} className="opacity-85 hover:opacity-100">
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold tracking-[0.14em] uppercase opacity-70">Help</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/schools" className="opacity-85 hover:opacity-100">
                Schools &amp; bulk orders
              </Link>
            </li>
            <li>
              <Link to="/about" className="opacity-85 hover:opacity-100">
                About us
              </Link>
            </li>
            <li className="opacity-85">Free shipping over ₹499</li>
            <li className="opacity-85">Easy 7-day returns</li>
            <li className="opacity-85">COD · UPI · Cards</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-foreground/15">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs opacity-70">
          © {new Date().getFullYear()} Sanabooks India. A Sanabooks Singapore company.
        </p>
      </div>
    </footer>
  );
}
