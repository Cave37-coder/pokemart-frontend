import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

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
