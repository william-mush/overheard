# Live Sources for Trump Statements and Quotes

This document catalogs sources for obtaining near-real-time Trump statements, quotes, and speeches. Sources are organized by type and include technical details for integration.

---

## Table of Contents

1. [Truth Social Archives](#1-truth-social-archives)
2. [Official White House Sources](#2-official-white-house-sources)
3. [Transcript Services](#3-transcript-services)
4. [News Aggregation APIs](#4-news-aggregation-apis)
5. [Trump Quote APIs](#5-trump-quote-apis)
6. [Political Speech Archives](#6-political-speech-archives)
7. [RSS Feed Collections](#7-rss-feed-collections)
8. [Fact-Checking Sources](#8-fact-checking-sources)
9. [Television and Media APIs](#9-television-and-media-apis)

---

## 1. Truth Social Archives

### CNN Truth Social Archive (Recommended - Most Current)

| Attribute | Details |
|-----------|---------|
| **URL** | `https://ix.cnn.io/data/truth-social/truth_archive.json` |
| **Alternative Formats** | `.csv`, `.parquet` (change file extension) |
| **API Key Required** | No |
| **Update Frequency** | Every 5 minutes |
| **Content Type** | All Trump Truth Social posts |
| **Data Format** | JSON with post ID, timestamp, text (HTML), URL, media URLs, engagement metrics |

**Notes:** This is currently the most reliable and frequently updated source for Trump's Truth Social posts. Maintained by CNN data team.

---

### TrumpsTruth.org

| Attribute | Details |
|-----------|---------|
| **RSS Feed URL** | `https://trumpstruth.org/feed` |
| **Date-Filtered Feed** | `https://trumpstruth.org/feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` |
| **API Key Required** | No |
| **Update Frequency** | Every few minutes for posts; delayed for video/image analysis |
| **Content Type** | Truth Social posts, video transcripts, image descriptions |

**Notes:** Provides searchable archive with video transcript and image analysis capabilities beyond native Truth Social search. RSS is the primary programmatic access method.

---

### Apify Truth Social Scraper

| Attribute | Details |
|-----------|---------|
| **URL** | `https://apify.com/muhammetakkurtt/truth-social-scraper` |
| **API Key Required** | Yes (Apify account) |
| **Update Frequency** | On-demand scraping |
| **Content Type** | Profile posts, user data, engagement metrics |
| **Pricing** | Free tier available; paid plans for higher volume |

**Notes:** Professional scraper for social media analytics and content monitoring. Returns structured JSON data.

---

### ScrapeCreators Truth Social API

| Attribute | Details |
|-----------|---------|
| **URL** | `https://scrapecreators.com/truthsocial-api` |
| **API Key Required** | Yes |
| **Update Frequency** | Real-time |
| **Content Type** | Posts in clean JSON format via REST API |

**Notes:** Unofficial API that provides real-time access. Useful for alerts, automations, and dashboards.

---

## 2. Official White House Sources

### WhiteHouse.gov News Feed

| Attribute | Details |
|-----------|---------|
| **Main URL** | `https://www.whitehouse.gov/news/` |
| **Briefings & Statements** | `https://www.whitehouse.gov/briefings-statements/` |
| **Presidential Actions** | `https://www.whitehouse.gov/presidential-actions/` |
| **RSS Feed** | `https://www.whitehouse.gov/feed/` (standard WordPress feed) |
| **API Key Required** | No |
| **Update Frequency** | As statements are released |
| **Content Type** | Official statements, proclamations, executive orders, fact sheets, press briefings |

**Notes:** Official source for presidential communications. RSS feed follows standard WordPress structure.

---

### GovInfo RSS Feeds

| Attribute | Details |
|-----------|---------|
| **URL** | `https://www.govinfo.gov/feeds` |
| **API Key Required** | No |
| **Update Frequency** | Varies by collection; generally includes 100 most recent documents |
| **Content Type** | Government documents, Congressional records, presidential documents |

**Notes:** Can generate RSS feeds based on specific search results. Covers official government publications.

---

## 3. Transcript Services

### Rev.com Trump Transcripts

| Attribute | Details |
|-----------|---------|
| **Browse URL** | `https://www.rev.com/category/donald-trump` |
| **Transcript Library** | `https://www.rev.com/transcripts` |
| **API Available** | Yes (for ordering transcriptions) |
| **API Docs** | `https://www.rev.com/api/docs` |
| **API Key Required** | Yes (for API access) |
| **Update Frequency** | Manual - transcripts added after speeches/events |
| **Content Type** | Full transcripts of speeches, interviews, public appearances |

**Notes:** High-quality human transcriptions. API is primarily for ordering new transcriptions, not accessing existing transcript library. Existing transcripts accessible via web scraping.

---

### Factba.se / Roll Call Factbase

| Attribute | Details |
|-----------|---------|
| **Search URL** | `https://rollcall.com/factbase/trump/search/` |
| **Main Site** | `https://factba.se/` |
| **API Key Required** | Partial - basic search free, advanced features may require access |
| **Data Formats** | JSON, CSV, iCal, Google Calendar |
| **Update Frequency** | Ongoing - comprehensive archive |
| **Content Type** | Speeches, interviews, tweets (archived), press conferences, all public statements |

**Notes:** Most comprehensive Trump statement archive. Founded in 2017, includes deleted tweets, video archive. Data available through API per project documentation. GitHub repository: `github.com/FactSquared/factbase-trump-brand-raw-data`

---

## 4. News Aggregation APIs

### NewsAPI.org

| Attribute | Details |
|-----------|---------|
| **URL** | `https://newsapi.org/` |
| **Endpoints** | `/v2/everything`, `/v2/top-headlines` |
| **Example Query** | `GET /v2/everything?q=trump&apiKey=YOUR_KEY` |
| **API Key Required** | Yes (free tier available) |
| **Rate Limits** | Free: 100 requests/day; Paid plans available |
| **Update Frequency** | Real-time news indexing |
| **Content Type** | News articles mentioning search terms |
| **Search Features** | Keywords, exact phrases, boolean operators, date ranges, source filtering |

**Notes:** Good for monitoring news coverage and extracting quotes from articles. Cannot directly provide statements but excellent for coverage monitoring.

---

### NewsData.io

| Attribute | Details |
|-----------|---------|
| **URL** | `https://newsdata.io/` |
| **API Key Required** | Yes |
| **Pricing** | Free: 200 credits/day (12hr delay); Basic: $199.99/mo; Professional: $349.99/mo; Corporate: $1,299.99/mo |
| **Rate Limits** | Free: 30 credits/15 min; Paid: 1,800 credits/15 min |
| **Update Frequency** | Real-time (paid), 12-hour delay (free) |
| **Content Type** | News articles from 84,675+ sources, 89 languages |
| **Categories** | Politics, Finance, Tech, Sports with advanced filtering |

**Notes:** More comprehensive than NewsAPI.org with better global coverage. Political news category available.

---

### NewsAPI.ai

| Attribute | Details |
|-----------|---------|
| **URL** | `https://newsapi.ai/` |
| **API Key Required** | Yes |
| **Update Frequency** | Real-time |
| **Content Type** | Full news content, entity mentions, topics, sentiment analysis |

**Notes:** Includes NLP features for entity extraction and sentiment analysis on political content.

---

### GDELT Project

| Attribute | Details |
|-----------|---------|
| **Main URL** | `https://www.gdeltproject.org/` |
| **DOC API** | Fulltext search |
| **GEO API** | Geographic data |
| **TV API** | Television news |
| **Global Quotation Graph** | Quoted statements database |
| **API Key Required** | No (for basic access) |
| **Update Frequency** | Every 15 minutes (GDELT 2.0) |
| **Content Type** | Events, quotes, people, organizations, themes, emotions from global news |
| **Access Methods** | JSON APIs, Google BigQuery, Raw CSV files (2.5TB+/year) |

**Notes:** Monitors worldwide news in 152 languages. Global Quotation Graph specifically captures quoted statements. Excellent for tracking what Trump says as reported globally. Free access via APIs and BigQuery.

---

## 5. Trump Quote APIs

### What Does Trump Think API

| Attribute | Details |
|-----------|---------|
| **Base URL** | `https://api.whatdoestrumpthink.com/api/` |
| **Endpoints** | `v1/quotes/random`, `v1/quotes/personalized?q=NAME`, `v1/quotes` |
| **API Key Required** | No - 100% open and free |
| **Rate Limits** | Unspecified; returns 429 if exceeded |
| **Content Type** | Historical Trump quotes with NLP attributes |
| **Response Format** | JSON |

**Example:**
```bash
curl https://api.whatdoestrumpthink.com/api/v1/quotes/random
```

**Notes:** Good for historical quotes, not real-time. No authentication needed.

---

### Tronalddump API

| Attribute | Details |
|-----------|---------|
| **URL** | `https://www.freepublicapis.com/tronalddump-api` |
| **API Key Required** | No |
| **Content Type** | Trump quotes with tags and sources |

**Notes:** Web archive for Trump quotes. Good for historical reference.

---

## 6. Political Speech Archives

### The Trump Archive (thetrumparchive.com)

| Attribute | Details |
|-----------|---------|
| **URL** | `https://www.thetrumparchive.com/` |
| **FAQ** | `https://www.thetrumparchive.com/faq` |
| **API Key Required** | No direct API |
| **Data Access** | CSV export, GitHub datasets |
| **Content Type** | 50,000+ archived Trump tweets |
| **Related Dataset** | `github.com/edsu/trump-archive-wayback` (Tweet IDs + Wayback Machine data) |

**Notes:** Historical Twitter archive. No longer updated with new tweets since account suspension, but comprehensive historical record with Wayback Machine integration.

---

### Internet Archive Trump Collection

| Attribute | Details |
|-----------|---------|
| **URL** | `https://archive.org/details/trumparchive` |
| **API Key Required** | No |
| **Content Type** | Videos, documents, media related to Trump |

**Notes:** Part of Internet Archive's broader collection efforts.

---

## 7. RSS Feed Collections

### Politico RSS Feeds

| Attribute | Details |
|-----------|---------|
| **Donald Trump Feed** | `https://rss.politico.com/donald-trump.xml` |
| **White House Feed** | `https://rss.politico.com/white-house.xml` |
| **Politics News** | `https://rss.politico.com/politics-news.xml` |
| **Playbook** | `https://rss.politico.com/playbook.xml` |
| **Congress** | `https://rss.politico.com/congress.xml` |
| **API Key Required** | No |
| **Update Frequency** | As articles published |
| **Content Type** | News articles, analysis |

**Full list:** `https://gist.github.com/natebass/4f953aaf804bf81ed40b5e749ae5db90`

---

### The Hill RSS

| Attribute | Details |
|-----------|---------|
| **Trump Feed** | `https://thehill.com/people/donald-trump/feed/` |
| **API Key Required** | No |
| **Content Type** | News and analysis |

---

### Feedspot Aggregated Feeds

| Attribute | Details |
|-----------|---------|
| **Trump Feeds Collection** | `https://rss.feedspot.com/donald_trump_rss_feeds/` |
| **White House Feeds** | `https://rss.feedspot.com/white_house_rss_feeds/` |
| **Political News Feeds** | `https://rss.feedspot.com/political_news_rss_feeds/` |
| **Content Type** | Curated list of 30+ Trump-related RSS feeds |

**Notes:** Good starting point for discovering multiple RSS sources.

---

## 8. Fact-Checking Sources

### PolitiFact

| Attribute | Details |
|-----------|---------|
| **Main URL** | `https://www.politifact.com/` |
| **All Content RSS** | `https://www.politifact.com/rss/all/` |
| **Fact-checks RSS** | `https://www.politifact.com/rss/factchecks/` |
| **Trump Page** | `https://www.politifact.com/personalities/donald-trump/` |
| **API Key Required** | No |
| **Content Type** | Fact-checks with Truth-O-Meter ratings |

**Notes:** Individual speaker pages have dedicated RSS feeds. Trump-specific feed available on his personality page.

---

## 9. Television and Media APIs

### GDELT TV API

| Attribute | Details |
|-----------|---------|
| **URL** | `https://blog.gdeltproject.org/gdelt-2-0-television-api-debuts/` |
| **API Key Required** | No |
| **Update Frequency** | Near real-time |
| **Content Type** | Television news mentions, closed captioning data |

**Notes:** Tracks mentions across TV news. Can monitor when Trump is discussed or quoted on television.

---

### C-SPAN Video Library

| Attribute | Details |
|-----------|---------|
| **URL** | `https://www.c-span.org/` |
| **Video Library** | `https://www.c-span.org/search/` |
| **API Key Required** | No official API |
| **Content Type** | 160,000+ hours of video since 1987, Congressional proceedings |
| **Transcript Access** | Official House/Senate floor and White House transcripts attached |
| **Third-Party Tool** | `github.com/EricWiener/cspan-crawler` (NPM package for transcript extraction) |

**Notes:** No official API, but transcripts can be extracted via third-party tools. Comprehensive coverage of official proceedings.

---

## Summary: Recommended Sources by Use Case

### For Real-Time Truth Social Posts
1. **CNN Archive** (`ix.cnn.io`) - 5-minute updates, free, JSON/CSV
2. **TrumpsTruth.org RSS** - Few minutes delay, includes video transcripts

### For Official Statements
1. **WhiteHouse.gov RSS** - Official source
2. **GovInfo** - Government documents

### For Comprehensive Historical Archive
1. **Factba.se** - Most complete, includes video
2. **The Trump Archive** - Twitter history

### For News Coverage Monitoring
1. **NewsData.io** - Best coverage, requires paid plan for real-time
2. **GDELT** - Free, global coverage, quote extraction
3. **NewsAPI.org** - Good free tier for development

### For Quotes Database
1. **GDELT Global Quotation Graph** - Global news quotes
2. **What Does Trump Think API** - Historical quotes, no auth needed

---

## Technical Notes

### Rate Limiting Considerations
- Most free APIs have daily/hourly limits
- GDELT and government sources generally have no limits
- Commercial APIs (NewsData.io, Apify) scale with pricing tier

### Data Freshness
- Truth Social archives: 5 minutes (CNN) to few minutes (TrumpsTruth)
- News APIs: Real-time to 12-hour delay depending on tier
- GDELT: 15-minute update cycle
- Official sources: As released

### Authentication Summary
| Source | Auth Required |
|--------|---------------|
| CNN Archive | No |
| TrumpsTruth RSS | No |
| WhiteHouse.gov | No |
| GDELT | No |
| What Does Trump Think | No |
| NewsAPI.org | Yes (free tier) |
| NewsData.io | Yes |
| Apify | Yes |
| Rev.com API | Yes |

---

*Last Updated: January 2026*
