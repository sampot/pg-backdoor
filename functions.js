export default {
  async fetch(request) {
    return Response.json({
      ok: true,
      name: "pg-backdoor",
      path: new URL(request.url).pathname,
    });
  },
};
