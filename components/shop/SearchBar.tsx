"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { products } from "@/lib/shop/mockData";
import { Input } from "@/components/shop/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

interface SearchBarProps {
  large?: boolean;
}

const SearchBar = ({ large = false }: SearchBarProps) => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.length > 0
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.nameTh.includes(query) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="text-lg" />
        </span>
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={t("search.placeholder")}
          className={`pl-10 pr-4 bg-card border-border focus:ring-primary ${large ? "h-14 text-lg rounded-xl" : "h-10 rounded-lg"}`}
        />
      </div>
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { router.push(`/shop/product/${p.id}`); setShowSuggestions(false); setQuery(""); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
            >
              <img src={p.image} alt={p.name} className="w-10 h-10 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{language === "th" ? p.nameTh : p.name}</p>
                <p className="text-xs text-muted-foreground">{p.code} · ฿{p.price.toLocaleString()}</p>
              </div>
              {p.badge && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{p.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
