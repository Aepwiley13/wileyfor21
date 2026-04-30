// Serve /hub.html for every request that arrives on the hub.wileyfor21.com host.
// Netlify's redirect engine does not support Host-header conditions in netlify.toml,
// so this Edge Function handles the host-based routing instead.
export default async (request, context) => {
  const host = (request.headers.get("host") || "").toLowerCase();
  if (host !== "hub.wileyfor21.com") {
    return context.next();
  }

  const url = new URL(request.url);
  if (url.pathname === "/hub.html") {
    return context.next();
  }

  const target = new URL("/hub.html", url);
  target.search = url.search;
  target.hash = url.hash;
  return context.rewrite(target.toString());
};

export const config = {
  path: "/*",
};
