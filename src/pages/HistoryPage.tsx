import { useState, useMemo } from "react";
import { useStore, HistoryItem, FavoriteItem } from "../store";
import { getProvider, LANGUAGES } from "../providers";
import { useNavigate } from "react-router-dom";

function formatDate(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  if (itemDate.getTime() === today.getTime()) return "Today";
  if (itemDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getLangLabel(code: string): string {
  return code.toUpperCase();
}

type ListItem = (HistoryItem | FavoriteItem) & { _type?: string };

function ItemRow({
  item,
  onClick,
  showDelete,
  onDelete,
}: {
  item: ListItem;
  onClick: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="grid grid-cols-12 items-center p-6 bg-surface-container-lowest rounded-xl hover:bg-surface-container-highest transition-all cursor-pointer group"
    >
      <div className="col-span-1">
        <span className="text-[10px] font-black px-2 py-1 rounded bg-secondary-container text-on-secondary-container">
          {getLangLabel(item.sourceLang)} &rarr; {getLangLabel(item.targetLang)}
        </span>
      </div>
      <div className="col-span-4 pr-6">
        <p className="text-sm font-medium text-on-surface line-clamp-2">
          {item.sourceText}
        </p>
      </div>
      <div className="col-span-4 pr-6">
        <p className="text-sm text-on-surface-variant line-clamp-2">
          {item.targetText}
        </p>
      </div>
      <div className="col-span-2 flex items-center space-x-2">
        <span className="material-symbols-outlined text-primary text-lg">
          {getProvider(item.engine)?.icon || "translate"}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {getProvider(item.engine)?.name || item.engine}
        </span>
      </div>
      <div className="col-span-1 flex items-center justify-end gap-3">
        <span className="text-[10px] font-bold text-on-surface-variant/60">
          {formatTime(item.timestamp)}
        </span>
        {showDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error"
            title="Remove from favorites"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { history, favorites, fillFromHistory, toggleFavorite } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "favorites">("all");
  const [search, setSearch] = useState("");
  const [filterEngine, setFilterEngine] = useState("all");

  const sourceList = tab === "all" ? history : favorites;

  const engines = useMemo(() => {
    const set = new Set(sourceList.map((h) => h.engine));
    return Array.from(set);
  }, [sourceList]);

  const filtered = useMemo(() => {
    return sourceList.filter((item) => {
      const matchSearch =
        !search ||
        item.sourceText.toLowerCase().includes(search.toLowerCase()) ||
        item.targetText.toLowerCase().includes(search.toLowerCase());
      const matchEngine =
        filterEngine === "all" || item.engine === filterEngine;
      return matchSearch && matchEngine;
    });
  }, [sourceList, search, filterEngine]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((item) => {
      const dateKey = formatDate(item.timestamp);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [filtered]);

  const handleClick = (item: ListItem) => {
    fillFromHistory(item as HistoryItem);
    navigate("/");
  };

  const handleRemoveFavorite = (item: FavoriteItem) => {
    toggleFavorite(item);
  };

  return (
    <div className="px-12 pt-8 pb-20 max-w-7xl mx-auto w-full">
      {/* Header */}
      <section className="mb-16">
        <h1 className="text-4xl font-black tracking-tight text-on-surface mb-2">
          Archive Explorer
        </h1>
        <p className="text-on-surface-variant font-medium">
          {history.length} translations · {favorites.length} favorites
        </p>
      </section>

      {/* Tab: All / Favorites */}
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={() => { setTab("all"); setFilterEngine("all"); }}
          className={`px-5 py-2 rounded-full text-sm font-bold tracking-tight transition-all ${
            tab === "all"
              ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
              : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
          }`}
        >
          All History
        </button>
        <button
          onClick={() => { setTab("favorites"); setFilterEngine("all"); }}
          className={`px-5 py-2 rounded-full text-sm font-bold tracking-tight transition-all flex items-center gap-2 ${
            tab === "favorites"
              ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
              : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span
            className="material-symbols-outlined text-base"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
          >
            star
          </span>
          Favorites
          {favorites.length > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
              tab === "favorites" ? "bg-white/20" : "bg-primary/10 text-primary"
            }`}>
              {favorites.length}
            </span>
          )}
        </button>
      </div>

      {/* Search & Engine Filter */}
      <div className="flex flex-col md:flex-row md:items-center space-y-6 md:space-y-0 md:space-x-10 mb-12">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archive..."
            className="w-full bg-surface-container-low border-none rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50 text-sm font-medium"
          />
        </div>
        {engines.length > 0 && (
          <div className="flex items-center bg-surface-container-high p-1 rounded-full">
            <button
              onClick={() => setFilterEngine("all")}
              className={`px-6 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all ${
                filterEngine === "all"
                  ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              ALL
            </button>
            {engines.map((eng) => (
              <button
                key={eng}
                onClick={() => setFilterEngine(eng)}
                className={`px-6 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all ${
                  filterEngine === eng
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {getProvider(eng)?.name || eng}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center text-on-surface-variant/50 py-20 text-lg italic">
          {tab === "favorites"
            ? "No favorites yet. Star a translation to save it here."
            : sourceList.length === 0
            ? "No translations yet. Start translating to build your archive."
            : "No results match your search."}
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(grouped).map(([date, items]) => (
            <section key={date}>
              <div className="sticky top-0 py-4 bg-surface/80 backdrop-blur-md z-10 mb-6">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant">
                  {date}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="group/row">
                    <ItemRow
                      item={item}
                      onClick={() => handleClick(item)}
                      showDelete={tab === "favorites"}
                      onDelete={() => handleRemoveFavorite(item as FavoriteItem)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 py-10 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Live Archive Syncing
          </span>
        </div>
      </footer>
    </div>
  );
}
