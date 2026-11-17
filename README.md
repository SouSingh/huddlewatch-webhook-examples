# HuddleWatch webhook examples

Receive new **Facebook group posts and comments** in your own code, n8n, Zapier or Make.

Meta shut down the Facebook Groups API on April 22, 2024, so there is no official way to get group posts into your systems any more. [HuddleWatch](https://huddle.watch) watches public and private Facebook groups from its own accounts and POSTs each new post to your webhook as signed JSON. On the Comments plan it also sends every new comment and reply on public-group posts, for 15 days after each post.

This repo has small, dependency-free receivers that verify the signature and dedupe retries, plus an importable n8n workflow.

| Path | What it is |
|---|---|
| [`node/server.mjs`](node/server.mjs) | Node 18+ receiver, no dependencies |
| [`python/server.py`](python/server.py) | Python 3.10+ receiver, standard library only |
| [`n8n/facebook-group-posts-and-comments-to-slack.json`](n8n/facebook-group-posts-and-comments-to-slack.json) | n8n workflow: posts and comments to Slack |

## Run a receiver

```bash
HUDDLEWATCH_SECRET=whsec_your_secret node node/server.mjs
# or
HUDDLEWATCH_SECRET=whsec_your_secret python3 python/server.py
```

Expose it with any tunnel (for example `cloudflared tunnel --url http://localhost:8787`), then paste the URL into HuddleWatch under **Settings → Delivery → Webhook → Endpoint URL**, and the same secret into **Signing secret**.

## Payload

Every delivery is a JSON `POST`. Posts and comments share one endpoint and are told apart by `type`.

```json
{
  "type": "post",
  "id": "8c1f…",
  "group": "Austin Home Services",
  "author": "Jane Doe",
  "body": "Can anyone recommend a house cleaner in Round Rock?",
  "permalink": "https://www.facebook.com/groups/123/posts/456/",
  "posted_at": "2026-11-17T14:05:00Z",
  "score": 92,
  "confidence": 0.92,
  "reason": "asking for a cleaner recommendation"
}
```

Comments add these fields:

```json
{
  "type": "comment",
  "comment_id": "789",
  "parent_comment_id": null,
  "post_permalink": "https://www.facebook.com/groups/123/posts/456/",
  "first_seen_at": "2026-11-17T14:31:00Z",
  "permalink": "https://www.facebook.com/groups/123/posts/456/?comment_id=789"
}
```

- `id` is stable across retries. Failed deliveries are retried up to 8 times, so dedupe on it.
- `parent_comment_id` is set on replies, so you can rebuild threads.
- Facebook shows comment ages coarsely ("3d", "1w"); `first_seen_at` is when HuddleWatch first read the comment.

## Verify the signature

With a signing secret set, each request carries `X-HuddleWatch-Signature: sha256=<hex>`, the HMAC-SHA256 of the raw request body. Compute it over the bytes exactly as received, before parsing JSON, and compare in constant time. Both receivers here do this.

## n8n

Import `n8n/facebook-group-posts-and-comments-to-slack.json` (Workflows → Import from file), activate it, and paste the webhook node's **Production URL** into HuddleWatch. Step-by-step: [Send Facebook group posts to n8n](https://huddle.watch/blog/facebook-group-posts-to-n8n).

## Docs

- [Webhook reference](https://huddle.watch/blog/facebook-group-webhook)
- [Comments to a webhook](https://huddle.watch/blog/facebook-group-comments-to-webhook)
- [Facebook Groups API alternative](https://huddle.watch/facebook-groups-api-alternative)
- [Zapier and Make](https://huddle.watch/blog/facebook-group-leads-to-zapier)

## License

MIT
