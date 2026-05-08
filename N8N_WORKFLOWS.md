# n8n Workflows — Evans OS

Four workflows need to be created in n8n at https://n8n.evansautomation.tech

---

## 1. `/webhook/evans-ai-chat`

**Purpose:** Powers the AI Chat module. Receives messages from the OS, prepends the Evans Automation system prompt, and returns a Claude reply.

**Nodes:**
1. **Webhook** (POST `/webhook/evans-ai-chat`) — receives `{ messages: [...], userMessage: "..." }`
2. **Anthropic Chat Model** node — model: `claude-sonnet-4-6`, system prompt below
3. **Respond to Webhook** — returns `{ reply: "..." }`

**System prompt for node 2:**
```
You are the Evans Automation AI assistant, trained specifically to help Ethan Evans run and grow his voice AI automation business.

About Evans Automation:
- UK-based business that installs and manages AI voice agents for tradespeople (plumbers, electricians, locksmiths, HVAC engineers, etc.)
- Powered by Vapi AI voice technology
- Clients pay a monthly fee + per-minute call cost
- Ethan handles everything: sales, onboarding, technical setup, and client support
- Target clients: sole traders and small businesses who miss calls when they're on-site
- Main value prop: "Never miss a call again — your AI picks up 24/7 and books jobs"
- Portal URL: client.portal.evans-automation.com

Your job:
- Answer business questions, strategy, sales advice, and day-to-day decisions
- Always give actionable, Ethan-specific advice — not generic business tips
- If asked about pricing, typical range is £150–£400/month depending on call volume
- If asked to write copy/messages, make them sound direct, professional, and UK-friendly
- Keep answers concise and practical
```

---

## 2. `/webhook/evans-lead-scrape`

**Purpose:** Research a lead — scrapes their website and enriches with contact details.

**Nodes:**
1. **Webhook** (POST `/webhook/evans-lead-scrape`) — receives `{ url: "https://..." }`
2. **HTTP Request** (Firecrawl API) — `POST https://api.firecrawl.dev/v1/scrape`
   - Headers: `Authorization: Bearer YOUR_FIRECRAWL_KEY`
   - Body: `{ url: "{{$json.url}}", formats: ["markdown"], onlyMainContent: true }`
3. **Apify Actor** (optional enrichment) — use "Contact Details Scraper" actor
   - Input: `{ startUrls: [{ url: "{{$json.url}}" }] }`
4. **Anthropic Chat Model** — extract structured data from scraped content:
   ```
   Extract contact details from this website content. Return JSON: 
   { company_name, contact_name, email, phone, instagram_url, linkedin_url, description }
   Fill missing fields with null.
   Website content: {{$node.Firecrawl.json.data.markdown}}
   ```
5. **Code node** — parse Claude's JSON response
6. **Respond to Webhook** — returns the structured JSON

---

## 3. `/webhook/evans-lead-outreach`

**Purpose:** Generate a personalised cold outreach message for a specific lead.

**Nodes:**
1. **Webhook** (POST `/webhook/evans-lead-outreach`) — receives `{ company_name, website, contact_name, notes, instagram_url }`
2. **Anthropic Chat Model** — system prompt:
   ```
   You write cold outreach messages for Ethan Evans at Evans Automation (UK voice AI for tradespeople).
   
   Write a short, personalised cold outreach message (WhatsApp/email style, max 120 words) for this lead.
   
   Rules:
   - Start with something specific about their business (from the notes/website)
   - Mention the pain of missing calls when on-site
   - Offer a quick call to explain how voice AI works
   - Sound like a real person, not a marketing email
   - UK English, no fluff
   - Sign off as "Ethan — Evans Automation"
   
   Lead info:
   Company: {{$json.company_name}}
   Contact: {{$json.contact_name}}
   Website: {{$json.website}}
   Notes: {{$json.notes}}
   ```
3. **Respond to Webhook** — returns `{ message: "..." }`

---

## 4. `/webhook/evans-ig-analyse`

**Purpose:** AI analysis of an Instagram post — suggestions for improvement.

**Nodes:**
1. **Webhook** (POST `/webhook/evans-ig-analyse`) — receives `{ caption, likes, comments, reach, media_type, all_posts_avg_likes, total_posts }`
2. **Anthropic Chat Model** — system prompt:
   ```
   You are a social media strategist helping Ethan Evans grow his Instagram for Evans Automation (UK voice AI business for tradespeople).
   
   Analyse this post and give specific, actionable feedback. Format your response with these sections:
   
   **Performance:** [Brief assessment vs his average]
   **What worked:** [1-2 specific things]
   **Improvements:** [2-3 specific edits to caption, CTA, or format]
   **Hashtag suggestions:** [5-8 relevant hashtags]
   **Best time to post:** [Based on tradespeople audience — typically 6-8am or 7-9pm weekdays]
   
   Post data: Caption: "{{$json.caption}}" | Likes: {{$json.likes}} | Comments: {{$json.comments}} | Reach: {{$json.reach}} | Type: {{$json.media_type}} | His avg likes: {{$json.all_posts_avg_likes}}
   ```
3. **Respond to Webhook** — returns `{ analysis: "..." }`

---

## Getting your n8n API Key (for MCP)

1. In n8n → Settings → API
2. Create a new API key
3. Add it to `.mcp.json` in this project: `"N8N_API_KEY": "your-key-here"`
4. Restart Claude Code — the n8n MCP will connect and you can ask Claude to build/update workflows directly

---

## n8n-skills (optional, makes Claude better at building workflows)

Install from https://github.com/czlonkowski/n8n-skills — these 7 skills teach Claude to build flawless n8n workflows.
