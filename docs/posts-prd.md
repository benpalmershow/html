# Posts Product Requirements Document

## Overview

All future routine publishing starts in `json/journal.json`. The journal is now the primary feed for short commentary, links, reactions, and compact updates.

Standalone pages remain available for longer treatments, but they are secondary. When a topic needs more than a short journal entry, publish the longform page in `article/` and link to it from the relevant journal entry.

**Core principles:** journal first, concise by default, link outward only when length or structure requires it.

---

## Default Publishing Workflow

1. Add the new item to the newest date block in `json/journal.json`, or create a new top level date block if needed.
2. Write the entry as a compact journal note with a `title` and optional `content`.
3. If the topic needs a full treatment, create a dedicated page in `article/` and link to it from the journal entry.
4. Do not create a new `article/posts/` card or `json/posts.json` entry unless explicitly requested for a homepage card or legacy compatibility.

---

## Journal Entry Requirements

Each journal entry lives inside a dated object in `json/journal.json`:

```json
{
  "date": "03/22/26",
  "entries": [
    {
      "title": "📰 Title",
      "content": "Short commentary with optional <a href='article/example.html'>link</a>."
    }
  ]
}
```

### Required elements

1. `date` in `MM/DD/YY` format at the group level
2. `title` for every entry
3. Optional `content` for body copy, links, or context
4. Valid HTML for any inline links

### Formatting standards

- Keep entries concise. One or two short paragraphs is the default.
- HTML is allowed in `title` and `content`, but keep it simple.
- External links must use `target='_blank'` and `rel='noopener noreferrer'`.
- Internal links should point directly to the relevant page such as `news.html?article=slug`, `media.html#slug`, `financials.html?filter=Category`, or an `article/...` page.
- Emojis are acceptable in journal titles because the journal feed already uses them extensively.
- No em dashes in prose. Use a hyphen with spaces instead.

---

## When To Create A Longer Page

Create a dedicated page in `article/` when the item needs any of the following:

- Multiple paragraphs of argument or reporting
- Supporting images, charts, or embeds
- A durable URL that should stand on its own
- A topic likely to be linked or referenced later

In those cases, the journal entry becomes the distribution layer and the article page holds the full treatment.

Example:

```json
{
  "title": "🛸 <a href='news.html?article=military-drones'>Military Drones</a>",
  "content": "Updated comparison of reusable UAVs, loitering munitions, and one-way attack drones through the lens of cost exchange and production scale."
}
```

---

## Legacy Post System

`article/posts/` and `json/posts.json` still exist on the site, but they are no longer the default workflow for new content. Treat them as legacy or special purpose surfaces unless a task specifically calls for a homepage post card or a backwards-compatible post entry.

---

## Publishing Checklist

- [ ] Entry added to the correct date block in `json/journal.json`
- [ ] `title` is present and reads cleanly in the feed
- [ ] `content` is concise and valid HTML if used
- [ ] Internal or external links point to the right destination
- [ ] External links include `target='_blank'` and `rel='noopener noreferrer'`
- [ ] No em dashes in prose
- [ ] Longer page created in `article/` only if the topic genuinely needs it

---

## Common Pitfalls

- Adding new routine content to `article/posts/` instead of `json/journal.json`
- Forgetting to create a new date block when publishing on a new day
- Invalid inline HTML in `title` or `content`
- Missing `rel='noopener noreferrer'` on external links
- Turning a short journal item into a standalone page when a linkable note would do
