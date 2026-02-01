#!/usr/bin/env python3
"""
White House Transcript Collector
Collects transcripts from the White House Briefing Room.

The White House publishes official transcripts of:
- Presidential speeches and remarks
- Press briefings
- Statements and releases
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Please install required packages: pip install requests beautifulsoup4")
    sys.exit(1)

# White House Briefing Room URLs
WH_BASE = "https://www.whitehouse.gov"
WH_BRIEFING_ROOM = "https://www.whitehouse.gov/briefing-room/"
WH_SPEECHES = "https://www.whitehouse.gov/briefing-room/speeches-remarks/"
WH_STATEMENTS = "https://www.whitehouse.gov/briefing-room/statements-releases/"
WH_BRIEFINGS = "https://www.whitehouse.gov/briefing-room/press-briefings/"

# Request headers
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

# Speaker identification patterns
SPEAKER_PATTERNS = {
    "donald-trump": [
        r"president\s+trump",
        r"the\s+president:",
        r"donald\s+j?\.\s*trump"
    ],
    "stephen-miller": [
        r"stephen\s+miller",
        r"mr\.\s+miller:",
        r"deputy\s+chief\s+of\s+staff\s+miller"
    ],
    "kristi-noem": [
        r"secretary\s+noem",
        r"kristi\s+noem",
        r"dhs\s+secretary"
    ],
    "jd-vance": [
        r"vice\s+president\s+vance",
        r"jd\s+vance",
        r"the\s+vice\s+president:"
    ]
}


def get_page_content(url):
    """Fetch and parse a web page."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None


def get_briefing_room_articles(section_url, max_pages=3):
    """Get list of articles from a briefing room section."""
    articles = []

    for page in range(1, max_pages + 1):
        url = f"{section_url}page/{page}/" if page > 1 else section_url
        print(f"  Fetching page {page}...")

        soup = get_page_content(url)
        if not soup:
            break

        # Find article links - structure may vary
        article_links = soup.select('article a, .briefing-statement a, .news-item a, h2 a')

        for link in article_links:
            href = link.get('href', '')
            if '/briefing-room/' in href and href not in [a['url'] for a in articles]:
                title = link.get_text(strip=True)
                if title and len(title) > 10:
                    articles.append({
                        "url": href if href.startswith('http') else urljoin(WH_BASE, href),
                        "title": title
                    })

    return articles


def get_article_transcript(url):
    """Extract transcript from a White House article page."""
    soup = get_page_content(url)
    if not soup:
        return None

    result = {
        "url": url,
        "title": None,
        "date": None,
        "text": None,
        "speaker": None
    }

    # Get title
    title_el = soup.select_one('h1, .page-title, article h1')
    if title_el:
        result["title"] = title_el.get_text(strip=True)

    # Get date
    date_el = soup.select_one('time, .date, .posted-on, [datetime]')
    if date_el:
        date_str = date_el.get('datetime') or date_el.get_text(strip=True)
        result["date"] = parse_date(date_str)

    # Get main content
    content_el = soup.select_one('article .entry-content, .body-content, article .content, main article')
    if content_el:
        # Remove unwanted elements
        for unwanted in content_el.select('script, style, nav, .share-buttons, .related'):
            unwanted.decompose()

        text = content_el.get_text(separator='\n')
        text = clean_transcript(text)
        result["text"] = text

        # Identify speaker
        result["speaker"] = identify_speaker(text, result["title"])

    return result


def clean_transcript(text):
    """Clean up transcript text."""
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)

    # Remove common boilerplate
    boilerplate_patterns = [
        r'###',
        r'Share this:.*',
        r'Related Articles.*',
        r'Tags:.*'
    ]

    for pattern in boilerplate_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)

    return text.strip()


def identify_speaker(text, title=None):
    """Identify the primary speaker from transcript content."""
    combined = f"{title or ''} {text[:2000]}".lower()

    for speaker_id, patterns in SPEAKER_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, combined, re.IGNORECASE):
                return speaker_id

    return "unknown"


def parse_date(date_str):
    """Parse date string to ISO format."""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")

    # Handle ISO format
    if 'T' in date_str:
        return date_str.split('T')[0]

    # Try common formats
    formats = [
        "%B %d, %Y",
        "%b %d, %Y",
        "%m/%d/%Y",
        "%Y-%m-%d",
        "%B %d %Y"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    return datetime.now().strftime("%Y-%m-%d")


def detect_event_type(title):
    """Detect event type from title."""
    title_lower = title.lower() if title else ""

    if 'press briefing' in title_lower:
        return 'briefing'
    elif 'remarks' in title_lower:
        return 'speech'
    elif 'address' in title_lower:
        return 'speech'
    elif 'statement' in title_lower:
        return 'statement'
    elif 'executive order' in title_lower:
        return 'executive_order'
    else:
        return 'speech'


def collect_speeches(max_articles=20, output_file="../data/whitehouse_transcripts.json"):
    """Collect transcripts from White House speeches and remarks."""
    print("Collecting White House speeches and remarks...")

    articles = get_briefing_room_articles(WH_SPEECHES, max_pages=3)
    print(f"Found {len(articles)} articles")

    transcripts = []
    processed = 0

    for article in articles[:max_articles]:
        print(f"Processing: {article['title'][:60]}...")

        result = get_article_transcript(article['url'])
        if not result or not result['text'] or len(result['text']) < 500:
            print("  Skipping (no content or too short)")
            continue

        speaker_id = result['speaker']
        speaker_name = get_speaker_name(speaker_id)

        transcripts.append({
            "id": f"wh-{hash(article['url']) & 0xFFFFFFFF:08x}",
            "speaker": speaker_name,
            "speakerId": speaker_id,
            "role": get_speaker_role(speaker_id),
            "date": result['date'],
            "source": "White House",
            "sourceUrl": article['url'],
            "eventType": detect_event_type(result['title']),
            "title": result['title'],
            "fullText": result['text'],
            "extractedQuotes": []
        })

        processed += 1
        print(f"  Collected: {len(result['text'])} characters")

    # Save results
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump({
            "source": "White House Transcripts",
            "collected_at": datetime.now().isoformat(),
            "count": len(transcripts),
            "transcripts": transcripts
        }, f, indent=2)

    print(f"\nCollected {len(transcripts)} transcripts to {output_file}")
    return transcripts


def get_speaker_name(speaker_id):
    """Get speaker name from ID."""
    names = {
        "donald-trump": "Donald Trump",
        "stephen-miller": "Stephen Miller",
        "kristi-noem": "Kristi Noem",
        "jd-vance": "JD Vance",
        "unknown": "White House Official"
    }
    return names.get(speaker_id, speaker_id)


def get_speaker_role(speaker_id):
    """Get speaker role from ID."""
    roles = {
        "donald-trump": "President",
        "stephen-miller": "Deputy Chief of Staff",
        "kristi-noem": "DHS Secretary",
        "jd-vance": "Vice President",
        "unknown": None
    }
    return roles.get(speaker_id)


def collect_press_briefings(max_articles=10, output_file="../data/whitehouse_briefings.json"):
    """Collect transcripts from press briefings."""
    print("Collecting White House press briefings...")

    articles = get_briefing_room_articles(WH_BRIEFINGS, max_pages=2)
    print(f"Found {len(articles)} briefings")

    transcripts = []

    for article in articles[:max_articles]:
        print(f"Processing: {article['title'][:60]}...")

        result = get_article_transcript(article['url'])
        if not result or not result['text'] or len(result['text']) < 500:
            print("  Skipping (no content or too short)")
            continue

        transcripts.append({
            "id": f"wh-briefing-{hash(article['url']) & 0xFFFFFFFF:08x}",
            "speaker": "Press Secretary",
            "speakerId": "press-secretary",
            "role": "Press Secretary",
            "date": result['date'],
            "source": "White House",
            "sourceUrl": article['url'],
            "eventType": "briefing",
            "title": result['title'],
            "fullText": result['text'],
            "extractedQuotes": []
        })

        print(f"  Collected: {len(result['text'])} characters")

    # Save results
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump({
            "source": "White House Briefings",
            "collected_at": datetime.now().isoformat(),
            "count": len(transcripts),
            "transcripts": transcripts
        }, f, indent=2)

    print(f"\nCollected {len(transcripts)} briefings to {output_file}")
    return transcripts


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Collect White House transcripts")
    parser.add_argument("--speeches", "-s", action="store_true", help="Collect speeches and remarks")
    parser.add_argument("--briefings", "-b", action="store_true", help="Collect press briefings")
    parser.add_argument("--all", "-a", action="store_true", help="Collect all types")
    parser.add_argument("--max", "-m", type=int, default=20, help="Max articles to collect")
    parser.add_argument("--output", "-o", default="../data/whitehouse_transcripts.json", help="Output file")
    parser.add_argument("--url", "-u", help="Collect from specific URL")

    args = parser.parse_args()

    if args.url:
        # Process single URL
        print(f"Fetching transcript from: {args.url}")
        result = get_article_transcript(args.url)
        if result and result['text']:
            print(f"Title: {result['title']}")
            print(f"Date: {result['date']}")
            print(f"Speaker: {result['speaker']}")
            print(f"Content: {len(result['text'])} characters")
            print("\nFirst 1000 characters:")
            print(result['text'][:1000])
        else:
            print("No transcript found")

    elif args.all or (not args.speeches and not args.briefings):
        # Collect everything
        collect_speeches(args.max, args.output)
        collect_press_briefings(args.max // 2, args.output.replace('.json', '_briefings.json'))

    else:
        if args.speeches:
            collect_speeches(args.max, args.output)
        if args.briefings:
            collect_press_briefings(args.max, args.output.replace('.json', '_briefings.json'))


if __name__ == "__main__":
    main()
