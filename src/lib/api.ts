import axios from "axios";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export interface Card {
  pb_id: string;
  sku: string;
  id: number;
  name: string;
  name_japanese: string;
  description: string;
  flavour_text: string;
  rarity: string;
  hp: number;
  artist: string;
  supertype: string;
  card_subtypes: string;
  pokedex_number: number;
  card_number: number;
  number: string;
  variant_override: string;
  weakness_type: string;
  weakness_value: string;
  resistance_type: string;
  resistance_value: string;
  retreat_cost: number;
  ability_name: string;
  ability_type: string;
  ability_text: string;
  attack_1_name: string;
  attack_1_damage: string;
  attack_1_text: string;
  attack_2_name: string;
  attack_2_damage: string;
  attack_2_text: string;
  image_url: string;
  image_small_url: string;
  price: string;
  price_holo: string;
  price_normal: string;
  price_reverse_holo: string;
  price_first_edition: string;
  stock: number;
  in_stock: boolean;
  tcgplayer_id: string;
  gengar_id: string;
  tcgcsv_product_id: number | null;
  pokemon_types: { id: number; name: string }[];
  card_set: {
    id: number;
    code: string;
    name: string;
    era: { id: number; code: string; name: string };
    symbol_url: string;
    logo_url: string;
    total_cards: number;
    release_date: string;
  };
}

export interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Card[];
}

export const getCards = async (params?: Record<string, string>) => {
  const { data } = await api.get<PaginatedResponse>("/api/products/", { params });
  return data;
};

export const getCard = async (id: number) => {
  const { data } = await api.get<Card>(`/api/products/${id}/`);
  return data;
};

// ---------------------------------------------------------------------------
// authFetch — for endpoints that require the customer to be logged in.
//
// The backend hands out two tokens at login: a short-lived access_token
// (sent on every request) and a longer-lived refresh_token (used only to
// get a new access_token once the old one goes stale). Every page used to
// read access_token straight out of localStorage and just give up with a
// hard redirect to the login page the moment it stopped working, even
// though the refresh_token sitting right next to it could have silently
// renewed the session instead. That's what was kicking customers out
// mid-action and losing whatever they were doing (My Pile adds, Checklist
// "Buy" clicks).
//
// authFetch fixes that: it attaches the access token automatically, and if
// the server says it's no good, it tries to renew it once using the
// refresh_token before retrying the request. Callers only need to catch
// SessionExpiredError, which is thrown when the refresh_token is also dead
// (i.e. the customer hasn't opened the site in 30+ days) -- that's the one
// case where a real "please log in again" message is actually correct.
// ---------------------------------------------------------------------------

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

async function renewAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access) return null;
    localStorage.setItem("access_token", data.access);
    return data.access as string;
  } catch {
    return null;
  }
}

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("access_token");
  if (!token) {
    throw new SessionExpiredError();
  }

  const send = (t: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...(options.headers as Record<string, string> | undefined), Authorization: `Bearer ${t}` },
    });

  let res = await send(token);

  if (res.status === 401) {
    const newToken = await renewAccessToken();
    if (!newToken) {
      clearSession();
      throw new SessionExpiredError();
    }
    res = await send(newToken);
    if (res.status === 401) {
      // Renewed token was rejected too -- treat as genuinely expired.
      clearSession();
      throw new SessionExpiredError();
    }
  }

  return res;
}

