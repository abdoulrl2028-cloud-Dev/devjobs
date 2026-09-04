"use client";

import { useFavorites } from "@/lib/app-context";

export default function FavoriteButton({ jobId }: { jobId: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(jobId);
  return (
    <button
      type="button"
      className={`btn btn--favorite ${fav ? "btn--favorite-on" : ""}`}
      onClick={() => toggleFavorite(jobId)}
      aria-pressed={fav}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill={fav ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"
        />
      </svg>
      {fav ? "Favoritada" : "Favoritar"}
    </button>
  );
}