import type { Holding } from "@/types";

// Заглушка холдинга на время загрузки данных из базы.
export const INIT_HOLDING: Holding = {
  id: 1,
  name: "Моя компания",
  inn: "",
};
