import { StoresBrowser } from "@/components/stores-browser";

export const metadata = { title: "Stores — OvenBase" };

/**
 * Official partnered stores. The Braverse site publishes regional distributor
 * contacts rather than a shop directory, so this starts from those four
 * distributors and is meant to be filled in with real shops per country.
 */
const STORE_SEED = [
  {
    id: "woc-my",
    name: "WOC Distribution",
    country: "MY" as const,
    city: "Malaysia",
    role: "Official distributor",
    contact: "support@wocdistribution.com",
    url: null,
  },
  {
    id: "woc-id",
    name: "WOC Distribution",
    country: "ID" as const,
    city: "Indonesia",
    role: "Official distributor",
    contact: "support@wocdistribution.com",
    url: null,
  },
  {
    id: "hobbycollect-ph",
    name: "HobbyCollect",
    country: "PH" as const,
    city: "Philippines",
    role: "Official distributor",
    contact: "support@hobbycollect.co",
    url: null,
  },
  {
    id: "ourgames-sg",
    name: "Our Games Trading",
    country: "SG" as const,
    city: "Singapore",
    role: "Official distributor",
    contact: "trade@ourgamestrading.com",
    url: null,
  },
  {
    id: "agora-sg",
    name: "Agora Hobby",
    country: "SG" as const,
    city: "Singapore",
    role: "Retailer — price source",
    contact: null,
    url: "https://agorahobby.com",
  },
  {
    id: "game-academia-sg",
    name: "Game Academia",
    country: "SG" as const,
    city: "Singapore",
    role: "Retailer — price source",
    contact: null,
    url: "https://game-academia.myshopify.com",
  },
];

export default function StoresPage() {
  return <StoresBrowser stores={STORE_SEED} />;
}
