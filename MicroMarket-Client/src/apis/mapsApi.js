const toArray = (any) => {
  if (Array.isArray(any)) return any;
  if (any?.results && Array.isArray(any.results)) return any.results;
  if (any?.data && Array.isArray(any.data)) return any.data;
  if (any?.data?.results && Array.isArray(any.data.results)) return any.data.results;
  // 1 số endpoint trả results là object -> convert sang array
  if (any?.results && typeof any.results === 'object') return Object.values(any.results);
  return [];
};

export const searchMaps = async (query, opt = {}) => {
  const myHeaders = new Headers();
  myHeaders.append("x-apihub-key", "rZ7mNuPnf4MFPqpusb2qh7T-dRJesSswg3XYiTQdYTnaK4fwd4");
  myHeaders.append("x-apihub-host", "Google-Maps-Apis-Alternative-GoMaps.allthingsdev.co");
  myHeaders.append("x-apihub-endpoint", "e84a662e-abd6-4fe3-a05d-de9e9b2421ae");

  const url =
    `https://Google-Maps-Data.proxy-production.allthingsdev.co/api/searchmaps.php?query=${encodeURIComponent(query)}&limit=${opt.limit ?? 8}&country=vn&lang=vi`;

  const res = await fetch(url, { method: "GET", headers: myHeaders, redirect: "follow" });
  if (!res.ok) throw new Error('AllThingsDev request failed');
  const json = await res.json();
  return toArray(json); // luôn trả về mảng
};
