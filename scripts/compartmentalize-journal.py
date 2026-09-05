#!/usr/bin/env python3
"""
Compartmentalize Journal Entries into 3-Tier Taxonomy.

This script enriches all entries in json/journal.json with:
- category: One of 5 core pillars ('economy', 'policy', 'trade', 'society', 'dispatches')
- subcategory: Curated sub-topic within each pillar
- tags: Semantic cross-cutting tags (array of lowercase strings)
- type: Content format ('note', 'essay', 'data', 'curation', 'verse')
"""

import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOURNAL_PATH = os.path.join(ROOT, 'json', 'journal.json')
BACKUP_PATH = os.path.join(ROOT, 'json', 'journal.json.bak')


def classify_entry(entry):
    title = entry.get('title', '')
    content = entry.get('content', '')
    link = entry.get('link', '')
    old_cat = entry.get('category', 'journal')
    file_path = entry.get('file', '')
    text = f'{title} {content} {link} {file_path}'.lower()

    tags = set()
    pillar = 'economy'
    subcat = 'indicators'
    entry_type = 'note'

    # 1. Determine Content Type
    if file_path:
        entry_type = 'essay'
    elif old_cat == 'poem' or 'poem' in text or 'melancholic rapture' in text or 'defund art' in text:
        entry_type = 'verse'
    elif any(term in text for term in ['{{chart:', 'odds', 'bps', 'probability', '13f', 'cpi', 'yield', 'percent', 'holdings']):
        entry_type = 'data'
    elif link and not content:
        entry_type = 'curation'
    elif link:
        entry_type = 'curation'
    else:
        entry_type = 'note'

    # 2. Determine Pillar & Subcategory
    if old_cat == 'poem':
        pillar = 'dispatches'
        subcat = 'verse'
        tags.add('poetry')
    elif old_cat == 'media':
        pillar = 'dispatches'
        subcat = 'curation'
        tags.add('media-rec')
        if any(w in text for w in ['song', 'music', 'album', 'playlist']):
            tags.add('music')
        if any(w in text for w in ['film', 'movie', 'rotten tomatoes', 'imdb']):
            tags.add('film')
        if any(w in text for w in ['book', 'author', 'read']):
            tags.add('books')
    elif old_cat == 'journal':
        pillar = 'dispatches'
        if any(w in text for w in ['screen', 'phone', 'app', 'digital', 'scroll', 'nicotine']):
            pillar = 'society'
            subcat = 'digital-life'
            tags.add('screentime')
        elif any(w in text for w in ['nyt', 'npr', 'press', 'headline']):
            subcat = 'critique'
            tags.add('media-critique')
        elif any(w in text for w in ['poem', 'verse', 'rapture', 'rhyme']):
            subcat = 'verse'
            tags.add('poetry')
        elif any(w in text for w in ['movie', 'song', 'listen', 'watch', 'book']):
            subcat = 'curation'
            tags.add('media-rec')
        else:
            subcat = 'personal'
            tags.add('dispatch')
    elif old_cat == 'housing':
        pillar = 'society'
        subcat = 'housing'
        tags.add('housing')
        if 'rent' in text:
            tags.add('rent')
        if 'price' in text or 'parities' in text:
            tags.add('real-estate')
    elif old_cat == 'healthcare':
        pillar = 'society'
        subcat = 'healthcare'
        tags.add('healthcare')
        if any(w in text for w in ['glp1', 'ozempic', 'weight']):
            tags.add('glp1')
        if 'medicaid' in text or 'medicare' in text:
            tags.add('medicaid')
    elif old_cat == 'trade':
        pillar = 'trade'
        if any(w in text for w in ['hormuz', 'ship', 'tanker', 'strait']):
            subcat = 'supply-chains'
            tags.update(['shipping', 'geopolitics'])
        elif any(w in text for w in ['oil', 'cips', 'swift', 'petro']):
            subcat = 'energy'
            tags.update(['energy', 'settlement'])
        elif any(w in text for w in ['manufacturing', 'factory', 'production', 'worker']):
            subcat = 'manufacturing'
            tags.update(['manufacturing', 'labor'])
        else:
            subcat = 'tariffs'
            tags.add('tariffs')
    elif old_cat in ('government', 'political', 'legal', 'policy', 'corrections'):
        pillar = 'policy'
        if old_cat == 'legal' or any(w in text for w in ['scotus', 'court', 'amendment', 'constitution', 'lawsuit', 'judge', '4th amendment']):
            subcat = 'legal'
            tags.add('legal')
            if 'scotus' in text:
                tags.add('scotus')
            if 'constitution' in text or 'amendment' in text:
                tags.add('constitution')
        elif any(w in text for w in ['debt', 'deficit', 'treasury debt', '40t', 'budget', 'grift', 'pension', 'spending', 'appropriation', 'tax revenue', 'billionaire tax']):
            subcat = 'fiscal'
            tags.add('fiscal')
            if 'debt' in text or 'treasury' in text:
                tags.add('national-debt')
            if 'grift' in text:
                tags.add('grift')
        elif any(w in text for w in ['screen time', 'screen', 'aap', 'children', 'parent']):
            pillar = 'society'
            subcat = 'digital-life'
            tags.update(['screentime', 'parenting'])
        elif any(w in text for w in ['tariff', 'trade']):
            pillar = 'trade'
            subcat = 'tariffs'
            tags.add('tariffs')
        elif old_cat == 'political' or any(w in text for w in ['election', 'vote', 'voter', 'trump', 'kamala', 'biden', 'party', 'parties', 'democrat', 'republican', 'popular constitution']):
            subcat = 'politics'
            tags.add('politics')
        elif old_cat == 'policy' or any(w in text for w in ['rule', 'regulation', 'fda', 'sec', 'ftc', 'fcc', 'ban', 'guidelines', 'statute']):
            subcat = 'regulatory'
            tags.add('regulation')
        else:
            subcat = 'fiscal' if old_cat == 'government' else 'politics'
            tags.add('policy')
    elif old_cat in ('economic', 'business', 'employment', 'prediction', 'consumer', 'earnings', 'ipo'):
        pillar = 'economy'
        if old_cat == 'employment' or any(w in text for w in ['labor', 'wage', 'job', 'adp', 'unemployment', 'strike']):
            subcat = 'labor'
            tags.add('labor')
        elif old_cat == 'prediction' or any(w in text for w in ['kalshi', 'polymarket', 'odds', 'fomc hold', 'fomc hike']):
            subcat = 'markets'
            tags.update(['prediction-markets', 'odds'])
            if 'fomc' in text:
                tags.add('fomc')
        elif old_cat in ('earnings', 'ipo') or any(w in text for w in ['13f', 'holdings', 'earnings', 'revenue', 'ipo', 'spacex', 'venture', 'sec']):
            subcat = 'corporate'
            tags.add('corporate')
            if '13f' in text or 'holdings' in text:
                tags.add('13f')
            if 'earnings' in text:
                tags.add('earnings')
            if 'ipo' in text:
                tags.add('ipo')
        elif any(w in text for w in ['screen time', 'gen x screen']):
            pillar = 'society'
            subcat = 'digital-life'
            tags.update(['screentime', 'demographics'])
        elif any(w in text for w in ['tariff', 'hormuz', 'import', 'export']):
            pillar = 'trade'
            subcat = 'tariffs' if 'tariff' in text else 'supply-chains'
            tags.add('trade')
        elif any(w in text for w in ['yen', 'dollar', 'yield', 'treasury', 'rate', 'stocks', 'nasdaq']):
            subcat = 'markets'
            tags.add('markets')
        else:
            subcat = 'indicators'
            tags.add('macro-data')
            if 'cpi' in text:
                tags.add('cpi')
            if 'sentiment' in text:
                tags.add('sentiment')

    # Universal contextual tags
    if 'nyt' in text:
        tags.add('nyt-critique')
    if 'trump' in text:
        tags.add('trump')
    if 'waymo' in text:
        tags.add('waymo')
    if 'hormuz' in text:
        tags.add('hormuz')
    if 'tariffs' in text or 'tariff' in text:
        tags.add('tariffs')
    if 'housing' in text:
        tags.add('housing')
    if 'glp1' in text or 'ozempic' in text:
        tags.add('glp1')
    if 'fomc' in text or 'fed' in text:
        tags.add('fomc')
    if 'kalshi' in text or 'polymarket' in text:
        tags.add('prediction-markets')
    if 'grift' in text:
        tags.add('grift')

    # Cross-page destination & medium tags
    if 'financials.html' in text:
        tags.add('financials')
    if 'media.html' in text:
        tags.add('media')
    if any(v in text for v in ['youtube.com', 'youtu.be', 'vimeo.com', 'data-video-src', '<iframe', 'watch?v=', '.mp4']):
        tags.add('video')
    if (link.startswith('http://') or link.startswith('https://')) and not any(v in link for v in ['youtube.com', 'youtu.be', 'vimeo.com']):
        tags.add('external')

    # Keep 1 to 5 tags
    clean_tags = sorted(list(tags))[:5]
    if not clean_tags:
        clean_tags = [subcat]

    return pillar, subcat, clean_tags, entry_type


def main():
    if not os.path.exists(JOURNAL_PATH):
        print(f"Error: {JOURNAL_PATH} not found", file=sys.stderr)
        sys.exit(1)

    print(f"Backing up journal.json to {BACKUP_PATH}...")
    shutil.copyfile(JOURNAL_PATH, BACKUP_PATH)

    with open(JOURNAL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    total_entries = 0
    pillar_counts = {}
    subcat_counts = {}
    type_counts = {}

    for day in data:
        entries = day.get('entries', [])
        for entry in entries:
            total_entries += 1
            pillar, subcat, tags, entry_type = classify_entry(entry)

            # Update entry fields
            entry['category'] = pillar
            entry['subcategory'] = subcat
            entry['tags'] = tags
            entry['type'] = entry_type

            pillar_counts[pillar] = pillar_counts.get(pillar, 0) + 1
            subcat_key = f"{pillar} -> {subcat}"
            subcat_counts[subcat_key] = subcat_counts.get(subcat_key, 0) + 1
            type_counts[entry_type] = type_counts.get(entry_type, 0) + 1

    with open(JOURNAL_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"Successfully processed {len(data)} date blocks and {total_entries} entries.")
    print("\n--- Canonical Pillars ---")
    for p, c in sorted(pillar_counts.items(), key=lambda x: -x[1]):
        print(f"  {p}: {c}")

    print("\n--- Subcategories ---")
    for s, c in sorted(subcat_counts.items()):
        print(f"  {s}: {c}")

    print("\n--- Content Types ---")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}")


if __name__ == '__main__':
    main()
