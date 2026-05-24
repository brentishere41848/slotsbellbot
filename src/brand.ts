export const slotsbellBrand = {
  name: "Slotsbell",
  color: 0xd6a23a,
  iconUrl: process.env.SLOTSBELL_ICON_URL
};

export function brandAuthor(): { name: string; iconURL?: string } {
  if (slotsbellBrand.iconUrl) {
    return {
      name: slotsbellBrand.name,
      iconURL: slotsbellBrand.iconUrl
    };
  }

  return {
    name: slotsbellBrand.name
  };
}
