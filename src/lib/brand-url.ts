export function brandToUrlParam(brand: string): string {
  return encodeURIComponent(brand);
}

export function brandFromUrlParam(param: string): string {
  return decodeURIComponent(param);
}

export function brandPagePath(brand: string): string {
  return `/brands/${brandToUrlParam(brand)}`;
}

export function earphonePagePath(brand: string, id: string): string {
  return `/brands/${brandToUrlParam(brand)}/${id}`;
}

export function brandComparePagePath(brand: string, ids: string[]): string {
  const base = `${brandPagePath(brand)}/compare`;
  if (ids.length === 0) {
    return base;
  }
  return `${base}?ids=${ids.map(encodeURIComponent).join(",")}`;
}

export function comparePagePath(ids: string[]): string {
  if (ids.length === 0) {
    return "/compare";
  }
  return `/compare?ids=${ids.map(encodeURIComponent).join(",")}`;
}
