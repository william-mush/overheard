#!/usr/bin/env python3
"""
Unified Transcript Collection Script
Collects from all sources and merges into the main transcripts.json

Sources:
- C-SPAN (congressional hearings, speeches)
- White House (official transcripts)
- YouTube (rally speeches, interviews via captions)
- Congress.gov (Congressional Record)
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add scripts directory to path
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
DATA_DIR.mkdir(exist_ok=True)

def load_existing_transcripts():
    """Load existing transcripts from data directory."""
    transcripts_file = DATA_DIR / 'transcripts.json'
    if transcripts_file.exists():
        with open(transcripts_file) as f:
            data = json.load(f)
            return data.get('transcripts', [])
    return []


def save_transcripts(transcripts):
    """Save merged transcripts to main file."""
    transcripts_file = DATA_DIR / 'transcripts.json'

    # Calculate stats
    by_speaker = {}
    by_topic = {}
    by_rhetoric = {}

    for t in transcripts:
        speaker_id = t.get('speakerId', 'unknown')
        by_speaker[speaker_id] = by_speaker.get(speaker_id, 0) + 1

        for quote in t.get('extractedQuotes', []):
            for cat in quote.get('categories', []):
                by_topic[cat] = by_topic.get(cat, 0) + 1
            for rhet in quote.get('rhetoric', []):
                by_rhetoric[rhet] = by_rhetoric.get(rhet, 0) + 1

    data = {
        "_schema": {
            "description": "Political speech transcripts database",
            "version": "1.0.0"
        },
        "transcripts": transcripts,
        "lastUpdated": datetime.now().isoformat(),
        "stats": {
            "totalTranscripts": len(transcripts),
            "totalQuotes": sum(len(t.get('extractedQuotes', [])) for t in transcripts),
            "bySpeaker": by_speaker,
            "byTopic": by_topic,
            "byRhetoric": by_rhetoric
        }
    }

    with open(transcripts_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Saved {len(transcripts)} transcripts to {transcripts_file}")


def merge_transcripts(existing, new_transcripts):
    """Merge new transcripts with existing, avoiding duplicates."""
    existing_ids = {t['id'] for t in existing}
    merged = existing.copy()

    added = 0
    for t in new_transcripts:
        if t['id'] not in existing_ids:
            merged.append(t)
            existing_ids.add(t['id'])
            added += 1

    print(f"Added {added} new transcripts, {len(merged)} total")
    return merged


def collect_from_cspan():
    """Collect transcripts from C-SPAN."""
    print("\n=== Collecting from C-SPAN ===")
    try:
        from cspan_collector import collect_all_speakers
        transcripts = collect_all_speakers(max_per_speaker=3)
        return transcripts
    except ImportError:
        print("C-SPAN collector not available (missing dependencies)")
        return []
    except Exception as e:
        print(f"C-SPAN collection error: {e}")
        return []


def collect_from_whitehouse():
    """Collect transcripts from White House."""
    print("\n=== Collecting from White House ===")
    try:
        from whitehouse_collector import collect_speeches
        transcripts = collect_speeches(max_articles=10)
        return transcripts
    except ImportError:
        print("White House collector not available (missing dependencies)")
        return []
    except Exception as e:
        print(f"White House collection error: {e}")
        return []


def collect_from_youtube(video_list=None):
    """Collect transcripts from YouTube."""
    print("\n=== Collecting from YouTube ===")
    try:
        from youtube_transcripts import collect_from_video_list
        if video_list:
            transcripts = collect_from_video_list(video_list)
            return transcripts
        else:
            print("No video list provided for YouTube collection")
            return []
    except ImportError:
        print("YouTube collector not available (missing youtube-transcript-api)")
        return []
    except Exception as e:
        print(f"YouTube collection error: {e}")
        return []


def run_analysis(transcripts):
    """Run quote extraction and analysis on transcripts."""
    print("\n=== Running Analysis ===")

    # Simple quote extraction based on patterns
    quote_patterns = [
        # Absolutist claims
        (r'\b(always|never|everyone|no one|every single|all of|none of)\b', 'absolutist-claims'),
        # Dehumanizing language
        (r'\b(animal|vermin|pest|infestation|invasion|flood|alien)\b', 'dehumanizing-language'),
        # Violent rhetoric
        (r'\b(destroy|eliminate|wipe out|fight|attack|war on|enemy)\b', 'violent-rhetoric'),
        # Immigration topics
        (r'\b(immigrant|border|deportation|migrant|illegal|alien)\b', 'immigration'),
        # Election topics
        (r'\b(vote|election|ballot|fraud|rigged|stolen)\b', 'election'),
    ]

    import re

    for transcript in transcripts:
        if transcript.get('extractedQuotes'):
            continue  # Already has quotes

        text = transcript.get('fullText', '')
        if not text:
            continue

        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        quotes = []

        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if len(sentence) < 20 or len(sentence) > 300:
                continue

            categories = []
            rhetoric = []

            for pattern, category in quote_patterns:
                if re.search(pattern, sentence, re.IGNORECASE):
                    if category in ['absolutist-claims', 'dehumanizing-language', 'violent-rhetoric']:
                        rhetoric.append(category)
                    else:
                        categories.append(category)

            # Only keep quotes with notable rhetoric or categories
            if rhetoric or len(categories) >= 2:
                quotes.append({
                    "id": f"{transcript['id']}-q{len(quotes)}",
                    "text": sentence,
                    "categories": list(set(categories)),
                    "rhetoric": list(set(rhetoric)),
                    "factCheck": {"rating": "unverified", "source": None, "sourceUrl": None}
                })

        transcript['extractedQuotes'] = quotes[:10]  # Limit to 10 quotes per transcript
        print(f"  {transcript.get('speaker', 'Unknown')}: extracted {len(quotes)} quotes")

    return transcripts


def main():
    """Main collection workflow."""
    import argparse

    parser = argparse.ArgumentParser(description="Collect political speech transcripts from all sources")
    parser.add_argument("--cspan", action="store_true", help="Collect from C-SPAN")
    parser.add_argument("--whitehouse", action="store_true", help="Collect from White House")
    parser.add_argument("--youtube", action="store_true", help="Collect from YouTube")
    parser.add_argument("--all", "-a", action="store_true", help="Collect from all sources")
    parser.add_argument("--analyze", action="store_true", help="Run analysis on collected transcripts")
    parser.add_argument("--youtube-list", help="JSON file with YouTube video list")

    args = parser.parse_args()

    # Load existing
    existing = load_existing_transcripts()
    print(f"Loaded {len(existing)} existing transcripts")

    all_new = []

    # Collect from selected sources
    if args.all or args.cspan:
        all_new.extend(collect_from_cspan())

    if args.all or args.whitehouse:
        all_new.extend(collect_from_whitehouse())

    if args.all or args.youtube:
        video_list = None
        if args.youtube_list:
            with open(args.youtube_list) as f:
                video_list = json.load(f)
        all_new.extend(collect_from_youtube(video_list))

    # Merge
    if all_new:
        merged = merge_transcripts(existing, all_new)
    else:
        merged = existing
        print("No new transcripts collected")

    # Analyze
    if args.analyze or all_new:
        merged = run_analysis(merged)

    # Save
    if merged:
        save_transcripts(merged)

    print("\nDone!")


if __name__ == "__main__":
    main()
