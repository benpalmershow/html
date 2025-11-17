#!/usr/bin/env python3
import json

# Mapping of dates to markdown files based on the user's requirements
date_to_file = {
    "2025-11-04T03:27:11_2": "article/posts/2025-11-04-novcara-playlist.md",
    "2025-11-04T03:27:11_3": "article/posts/2025-11-04-trump-interview.md",
    "2025-10-31T03:27:11": "article/posts/2025-10-31-fomc-december.md",
    "2025-10-30T03:27:11": "article/posts/2025-10-30-financial-updates.md",
    "2025-10-29T03:27:11": "article/posts/2025-10-29-consumer-confidence.md",
    "2025-10-28T03:27:11_1": "article/posts/2025-10-28-financial-data.md",
    "2025-10-28T03:27:11_2": "article/posts/2025-10-28-site-update.md",
    "2025-10-26T03:27:11": "article/posts/2025-10-26-cpi-update.md",
    "2025-10-24T03:27:11_1": "article/posts/2025-10-24-chicago-fed-survey.md",
    "2025-10-24T03:27:11_2": "article/posts/2025-10-24-sustainable-abundance.md",
    "2025-10-24T03:27:11_3": "article/posts/2025-10-24-housing-market-indicators.md",
    "2025-10-24T03:27:11_4": "article/posts/2025-10-24-used-vehicle-value-index.md",
    "2025-10-23T03:27:11": "article/posts/2025-10-23-navan-ipo-updates.md",
    "2025-10-22T03:27:11": "article/posts/2025-10-22-navan-ipo.md",
    "2025-10-21T03:27:11": "article/posts/2025-10-21-sharp-corner.md",
    "2025-10-18T03:27:11_1": "article/posts/2025-10-18-shipping-update.md",
    "2025-10-18T03:27:11_2": "article/posts/2025-10-18-treasury-statement.md",
    "2025-10-15T03:27:11": "article/posts/2025-10-15-new-books.md",
    "2025-10-14T03:27:11": "article/posts/2025-10-14-crime-analysis.md",
    "2025-10-10T03:27:11": "article/posts/2025-10-10-eagles-giants.md",
    "2025-10-09T03:27:11_1": "article/posts/2025-10-09-budget-deficits.md",
    "2025-10-09T03:27:11_2": "article/posts/2025-10-09-legal-analysis.md",
    "2025-10-08T03:27:11": "article/posts/2025-10-08-scotus-schedule.md",
    "2025-10-06T03:27:11_1": "article/posts/2025-10-06-bluegrass-festival.md",
    "2025-10-06T03:27:11_2": "article/posts/2025-10-06-patriots-bills.md",
    "2025-10-06T03:27:11_3": "article/posts/2025-10-06-manufacturing-pmi.md",
    "2025-10-06T03:27:11_4": "article/posts/2025-10-06-private-employment.md",
    "2025-10-06T03:27:11_5": "article/posts/2025-10-06-aaup-v-rubio.md",
    "2025-10-06T03:27:11_6": "article/posts/2025-10-06-49ers-rams.md",
    "2025-10-06T03:27:11_7": "article/posts/2025-10-06-tariff-revenue.md",
    "2025-10-06T03:27:11_8": "article/posts/2025-10-06-national-debt.md",
    "2025-10-06T03:27:11_9": "article/posts/2025-10-06-budget-deficit.md",
    "2025-10-06T03:27:11_10": "article/posts/2025-10-06-border-update.md",
    "2025-10-06T03:27:11_11": "article/posts/2025-10-06-financial-snapshot.md",
    "2025-10-06T03:27:11_12": "article/posts/2025-10-06-site-updates.md",
    "2025-10-06T03:27:11_13": "article/posts/2025-10-06-key-economic-indicators.md",
    "2025-10-06T03:27:11_14": "article/posts/2025-10-06-our-dollar-your-problem.md",
    "2025-10-06T03:27:11_15": "article/posts/2025-10-06-all-we-imagine.md",
    "2025-09-06T03:27:11_1": "article/posts/2025-09-06-ipos-to-watch.md",
    "2025-09-06T03:27:11_2": "article/posts/2025-09-06-sacred-fig.md",
    "2025-09-06T03:27:11_3": "article/posts/2025-09-06-new-books.md",
    "2025-09-06T03:27:11_4": "article/posts/2025-09-06-market-update.md",
    "2025-09-06T03:27:11_5": "article/posts/2025-09-06-diet-drugs-dopamine.md",
    "2025-09-06T03:27:11_6": "article/posts/2025-09-06-news-filtering.md",
    "2025-09-06T03:27:11_7": "article/posts/2025-09-06-employment-trends.md",
    "2025-08-07T03:27:11_1": "article/posts/2025-08-07-peloton-upgrade.md",
    "2025-08-07T03:27:11_2": "article/posts/2025-08-07-media-updates.md",
    "2025-08-07T03:27:11_3": "article/posts/2025-08-07-housing-pmi.md",
    "2025-08-07T03:27:11_4": "article/posts/2025-08-07-figma-ipo.md",
    "2025-08-07T03:27:11_5": "article/posts/2025-08-07-books-page.md",
    "2025-08-07T03:27:11_6": "article/posts/2025-08-07-budget-surplus.md",
    "2025-08-07T03:27:11_7": "article/posts/2025-08-07-site-update.md",
    "2025-07-08T03:27:11_1": "article/posts/2025-07-08-site-consolidation.md",
    "2025-07-08T03:27:11_2": "article/posts/2025-07-08-ca-housing-bills.md",
    "2025-07-08T03:27:11_3": "article/posts/2025-07-08-fomc-prediction.md",
    "2025-07-08T03:27:11_4": "article/posts/2025-07-08-animal-kingdom.md",
    "2025-07-08T03:27:11_5": "article/posts/2025-07-08-scotus-disclosures.md",
    "2025-07-08T03:27:11_6": "article/posts/2025-07-08-financial-updates.md",
    "2025-07-08T03:27:11_7": "article/posts/2025-07-08-cbo-report.md",
    "2025-07-08T03:27:11_8": "article/posts/2025-07-08-financials-page.md",
    "2025-06-08T03:27:11_1": "article/posts/2025-06-08-new-position.md",
    "2025-06-08T03:27:11_2": "article/posts/2025-06-08-circle-ipo.md",
    "2025-06-08T03:27:11_3": "article/posts/2025-06-08-portfolio-review.md",
    "2025-06-08T03:27:11_4": "article/posts/2025-06-08-movie-ratings.md",
    "2025-06-08T03:27:11_5": "article/posts/2025-06-08-fathers-song.md",
    "2025-06-08T03:27:11_6": "article/posts/2025-06-08-holy-spider.md",
}

# Read the JSON file
with open('/Users/benjaminpalmer/TBPS/html/html/json/posts.json', 'r') as f:
    content = f.read()

# Load as JSON
data = json.loads(content)

# Track counts for duplicate dates
date_counts = {}

# Process each post
for i, post in enumerate(data):
    if "content" in post:
        date = post["date"]
        
        # Track how many times we've seen this date
        if date not in date_counts:
            date_counts[date] = 0
        date_counts[date] += 1
        
        # Create a key for lookup
        if date_counts[date] > 1:
            lookup_key = f"{date}_{date_counts[date]}"
        else:
            lookup_key = date
        
        # Get the file path
        if lookup_key in date_to_file:
            # Replace content with file
            file_path = date_to_file[lookup_key]
            post.pop("content")
            post["file"] = file_path
            print(f"Updated {date} (#{date_counts[date]}) -> {file_path}")

# Save the updated JSON
with open('/Users/benjaminpalmer/TBPS/html/html/json/posts.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done!")
