import type { TFunction } from "i18next";

export function categoryLabel(name: string, t: TFunction): string {
  return t(`finance.categories.${name.toLowerCase()}`, {
    defaultValue: name,
  });
}
