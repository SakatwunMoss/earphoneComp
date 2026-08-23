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
