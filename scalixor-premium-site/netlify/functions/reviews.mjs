import { getStore } from "@netlify/blobs";

const STORE_NAME = "scalixor-reviews";
const MAX_REVIEWS = 5000;
const ALLOWED_STATUSES = new Set(["pending", "published", "rejected"]);

function store() {
  return getStore(STORE_NAME);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function clean(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function getAdminPassword(req) {
  const header = req.headers.get("x-scalixor-admin-password") || "";
  return header;
}

function requireAdmin(req) {
  const configured = process.env.SCALIXOR_ADMIN_PASSWORD || "";
  if (!configured) return { ok: false, response: json({ error: "Admin password is not configured on Netlify." }, 503) };
  if (getAdminPassword(req) !== configured) return { ok: false, response: json({ error: "Unauthorized." }, 401) };
  return { ok: true };
}

async function listReviews(includeAll = false) {
  const result = await store().list({ prefix: "review/" });
  const reviews = [];
  for (const item of result.blobs) {
    const review = await store().get(item.key, { type: "json", consistency: "strong" });
    if (review) reviews.push(review);
  }
  reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return includeAll ? reviews : reviews.filter((review) => review.status === "published");
}

export default async (req) => {
  try {
    const method = req.method.toUpperCase();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (method === "GET") {
      const admin = url.searchParams.get("admin") === "1";
      if (admin) {
        const auth = requireAdmin(req);
        if (!auth.ok) return auth.response;
        return json({ reviews: await listReviews(true) });
      }
      return json({ reviews: await listReviews(false) });
    }

    if (method === "POST") {
      const body = await req.json().catch(() => ({}));
      // Honeypot field: bots that fill this should get a harmless success response.
      if (clean(body.website, 200)) return json({ ok: true, message: "Thank you. Your review has been received." });

      const name = clean(body.name, 100);
      const email = clean(body.email, 180);
      const company = clean(body.company, 120);
      const reviewText = clean(body.review, 1800);
      const rating = Math.min(5, Math.max(1, Number(body.rating) || 0));

      if (name.length < 2) return json({ error: "Please enter your name." }, 400);
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Please enter a valid email address." }, 400);
      if (reviewText.length < 15) return json({ error: "Please write a little more about your experience." }, 400);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: "Please choose a rating from 1 to 5." }, 400);

      const current = await listReviews(true);
      if (current.length >= MAX_REVIEWS) return json({ error: "Review capacity has been reached. Please try again later." }, 429);

      const createdAt = new Date().toISOString();
      const review = {
        id: crypto.randomUUID(),
        name,
        email,
        company,
        review: reviewText,
        rating,
        status: "pending",
        featured: false,
        createdAt,
        updatedAt: createdAt
      };

      await store().setJSON(`review/${review.id}`, review, { onlyIfNew: true });
      return json({ ok: true, message: "Thank you. Your review has been received and is awaiting approval." }, 201);
    }

    if (method === "PUT") {
      const auth = requireAdmin(req);
      if (!auth.ok) return auth.response;
      if (!id) return json({ error: "Missing review id." }, 400);

      const key = `review/${id}`;
      const existing = await store().get(key, { type: "json", consistency: "strong" });
      if (!existing) return json({ error: "Review not found." }, 404);

      const body = await req.json().catch(() => ({}));
      const updated = {
        ...existing,
        name: clean(body.name ?? existing.name, 100),
        email: clean(body.email ?? existing.email, 180),
        company: clean(body.company ?? existing.company, 120),
        review: clean(body.review ?? existing.review, 1800),
        rating: Math.min(5, Math.max(1, Number(body.rating ?? existing.rating) || 0)),
        status: ALLOWED_STATUSES.has(body.status) ? body.status : existing.status,
        featured: Boolean(body.featured),
        updatedAt: new Date().toISOString()
      };

      if (updated.name.length < 2 || updated.review.length < 15 || !Number.isInteger(updated.rating)) {
        return json({ error: "Please provide valid review details." }, 400);
      }

      await store().setJSON(key, updated);
      return json({ ok: true, review: updated });
    }

    if (method === "DELETE") {
      const auth = requireAdmin(req);
      if (!auth.ok) return auth.response;
      if (!id) return json({ error: "Missing review id." }, 400);
      await store().delete(`review/${id}`);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("Scalixor reviews error", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};

export const config = {
  path: "/api/reviews"
};
