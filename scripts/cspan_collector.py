#!/usr/bin/env python3
"""
C-SPAN Transcript Collector
Scrapes transcripts from C-SPAN's website for political speeches and hearings.

C-SPAN provides full transcripts for most congressional proceedings.
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

# Base URLs
CSPAN_BASE = "https://www.c-span.org"
CSPAN_SEARCH = "https://www.c-span.org/search/"

# Speaker configurations
SPEAKERS = {
    "donald-trump": {
        "name": "Donald Trump",
        "search_terms": ["President Trump", "Donald Trump"],
        "roles": ["President"]
    },
    "stephen-miller": {
        "name": "Stephen Miller",
        "search_terms": ["Stephen Miller"],
        "roles": ["Deputy Chief of Staff", "Senior Advisor"]
    },
    "kristi-noem": {
        "name": "Kristi Noem",
        "search_terms": ["Kristi Noem", "Secretary Noem"],
        "roles": ["DHS Secretary", "Governor"]
    },
    "jd-vance": {
        "name": "JD Vance",
        "search_terms": ["JD Vance", "Vice President Vance"],
        "roles": ["Vice President", "Senator"]
    },
    "marjorie-taylor-greene": {
        "name": "Marjorie Taylor Greene",
        "search_terms": ["Marjorie Taylor Greene", "MTG"],
        "roles": ["Representative"]
    },
    "matt-gaetz": {
        "name": "Matt Gaetz",
        "search_terms": ["Matt Gaetz", "Representative Gaetz"],
        "roles": ["Representative"]
    },
    "jim-jordan": {
        "name": "Jim Jordan",
        "search_terms": ["Jim Jordan", "Chairman Jordan"],
        "roles": ["Representative", "Judiciary Chairman"]
    }
}

# Request headers to appear as browser
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5"
}


def search_cspan(query, page=1, per_page=20):
    """Search C-SPAN for videos matching query."""
    params = {
        "searchtype": "Videos",
        "query": query,
        "page": page,
        "sort": "Most Recent",
        "per_page": per_page
    }

    try:
        response = requests.get(CSPAN_SEARCH, params=params, headers=HEADERS, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        results = []
        for item in soup.select('.video-result'):
            title_el = item.select_one('.video-title a')
            date_el = item.select_one('.video-date')
            desc_el = item.select_one('.video-description')

            if title_el:
                results.append({
                    "title": title_el.get_text(strip=True),
                    "url": urljoin(CSPAN_BASE, title_el.get('href', '')),
                    "date": date_el.get_text(strip=True) if date_el else None,
                    "description": desc_el.get_text(strip=True) if desc_el else None
                })

        return results

    except Exception as e:
        print(f"Error searching C-SPAN: {e}")
        return []


def get_video_transcript(video_url):
    """Fetch transcript from a C-SPAN video page."""
    try:
        response = requests.get(video_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # C-SPAN stores transcripts in different ways
        # Try to find the transcript container
        transcript_container = soup.select_one('#transcript-content, .transcript, [data-transcript]')

        if transcript_container:
            # Clean up the transcript text
            text = transcript_container.get_text(separator=' ')
            text = re.sub(r'\s+', ' ', text).strip()
            return text

        # Try to find embedded transcript data
        script_tags = soup.find_all('script')
        for script in script_tags:
            if script.string and 'transcript' in script.string.lower():
                # Extract transcript from JavaScript
                match = re.search(r'"transcript"\s*:\s*"([^"]+)"', script.string)
                if match:
                    return match.group(1).encode().decode('unicode_escape')

        # Check for link to separate transcript page
        transcript_link = soup.select_one('a[href*="transcript"]')
        if transcript_link:
            transcript_url = urljoin(video_url, transcript_link.get('href'))
            return get_transcript_page(transcript_url)

        return None

    except Exception as e:
        print(f"Error fetching transcript from {video_url}: {e}")
        return None


def get_transcript_page(transcript_url):
    """Fetch transcript from a dedicated transcript page."""
    try:
        response = requests.get(transcript_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find the main content area
        content = soup.select_one('article, .content, #main-content, .transcript-text')
        if content:
            text = content.get_text(separator=' ')
            text = re.sub(r'\s+', ' ', text).strip()
            return text

        return None

    except Exception as e:
        print(f"Error fetching transcript page {transcript_url}: {e}")
        return None


def parse_date(date_str):
    """Parse C-SPAN date string to ISO format."""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")

    # Try common formats
    formats = [
        "%B %d, %Y",
        "%b %d, %Y",
        "%m/%d/%Y",
        "%Y-%m-%d"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    return datetime.now().strftime("%Y-%m-%d")


def collect_speaker_transcripts(speaker_id, max_results=10):
    """Collect transcripts for a specific speaker."""
    speaker = SPEAKERS.get(speaker_id)
    if not speaker:
        print(f"Unknown speaker: {speaker_id}")
        return []

    transcripts = []

    for search_term in speaker["search_terms"]:
        print(f"Searching for: {search_term}")
        results = search_cspan(search_term, per_page=max_results)

        for result in results:
            print(f"  Processing: {result['title']}")

            transcript_text = get_video_transcript(result['url'])
            if not transcript_text or len(transcript_text) < 500:
                print(f"    No transcript or too short, skipping")
                continue

            transcripts.append({
                "id": f"cspan-{hash(result['url']) & 0xFFFFFFFF:08x}",
                "speaker": speaker["name"],
                "speakerId": speaker_id,
                "role": speaker["roles"][0] if speaker["roles"] else None,
                "date": parse_date(result['date']),
                "source": "C-SPAN",
                "sourceUrl": result['url'],
                "eventType": detect_event_type(result['title']),
                "title": result['title'],
                "fullText": transcript_text,
                "extractedQuotes": []
            })

            print(f"    Collected: {len(transcript_text)} characters")

    return transcripts


def detect_event_type(title):
    """Detect the type of event from the title."""
    title_lower = title.lower()

    if 'hearing' in title_lower:
        return 'hearing'
    elif 'testimony' in title_lower:
        return 'testimony'
    elif 'press' in title_lower or 'briefing' in title_lower:
        return 'briefing'
    elif 'speech' in title_lower or 'address' in title_lower or 'remarks' in title_lower:
        return 'speech'
    elif 'interview' in title_lower:
        return 'interview'
    elif 'rally' in title_lower:
        return 'rally'
    elif 'debate' in title_lower:
        return 'debate'
    else:
        return 'speech'


def collect_all_speakers(max_per_speaker=5, output_file="../data/cspan_transcripts.json"):
    """Collect transcripts for all configured speakers."""
    all_transcripts = []

    for speaker_id in SPEAKERS.keys():
        print(f"\n=== Collecting transcripts for {SPEAKERS[speaker_id]['name']} ===")
        transcripts = collect_speaker_transcripts(speaker_id, max_per_speaker)
        all_transcripts.extend(transcripts)

    # Save results
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump({
            "source": "C-SPAN Transcripts",
            "collected_at": datetime.now().isoformat(),
            "count": len(all_transcripts),
            "transcripts": all_transcripts
        }, f, indent=2)

    print(f"\nCollected {len(all_transcripts)} total transcripts to {output_file}")
    return all_transcripts


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Collect C-SPAN transcripts for political speeches")
    parser.add_argument("--speaker", "-s", help="Collect for specific speaker ID only")
    parser.add_argument("--max", "-m", type=int, default=5, help="Max transcripts per speaker")
    parser.add_argument("--output", "-o", default="../data/cspan_transcripts.json", help="Output file")
    parser.add_argument("--url", "-u", help="Collect from specific C-SPAN URL")

    args = parser.parse_args()

    if args.url:
        # Process single URL
        print(f"Fetching transcript from: {args.url}")
        transcript = get_video_transcript(args.url)
        if transcript:
            print(f"Collected {len(transcript)} characters")
            print(transcript[:1000] + "..." if len(transcript) > 1000 else transcript)
        else:
            print("No transcript found")

    elif args.speaker:
        # Process single speaker
        transcripts = collect_speaker_transcripts(args.speaker, args.max)
        if transcripts:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w') as f:
                json.dump({
                    "source": "C-SPAN Transcripts",
                    "collected_at": datetime.now().isoformat(),
                    "count": len(transcripts),
                    "transcripts": transcripts
                }, f, indent=2)
            print(f"Saved {len(transcripts)} transcripts to {args.output}")

    else:
        # Process all speakers
        collect_all_speakers(args.max, args.output)


if __name__ == "__main__":
    main()
