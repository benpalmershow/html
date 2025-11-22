# Posts System Changelog

## 11/22/25 Consumer Sentiment Final Data Post
- **Post**: Consumer Sentiment: Final November Data
- **Data**: Final reading 51 (preliminary 50.3)
- **Format**: Markdown with shopping-cart icon for Consumer Indicators category
- **Change**: First post using standardized Consumer Indicators icon pattern

## 11/20/25 Total Nonfarm Employment Post
- **Date**: November 20, 2025
- **Post**: Total Nonfarm Employment Gains (September)
- **Data**: 159.626M (+0.1% MoM, +119K jobs)
- **Format**: Markdown with trending-up icon, metric breakdown, context, and link to employment indicators filter
- **Change**: First employment data post following markdown format standardization with MoM percentage calculations

## 11/20/25 Chart Syntax Standardization
- **Updated**: Complete rewrite of chart implementation section to reflect template syntax as primary method
- **Change**: Removed all references to manual canvas HTML; template syntax `{{chart:Indicator Name}}` is now the only recommended approach
- **Rationale**: Simplifies documentation, eliminates outdated code patterns, ensures consistency across all posts
- **What's New**:
  - Clear "PRIMARY METHOD" designation for template syntax
  - Removed 200+ lines of manual canvas documentation and examples
  - Simplified chart placement rules
  - Updated multi-topic post examples to use template syntax
  - Streamlined implementation checklist (removed manual canvas options)
  - Updated chart type selection table to show template syntax
  - Removed manual color scheme requirements (applied automatically)

## 10/29/25 Post Enhancement - Multi-Topic Detail
- **Original**: Brief bullet points with minimal context
- **Updated**: 
  - Made financial data more conversational
  - Simplified prediction markets
  - Changed "New Analysis" to "Latest Reads" for more approachable tone
  - Made news descriptions catchy and narrative-driven with conflict/tension
  - Changed article title from "Kei Trucks: Oregon's SB1213" to "Nimble Kei Trucks"
  - Made film description more dramatic
  - Added director credit "Dir. Philippe Lioret"
- **Prompt**: "make expounding a little more catchy and not just analysis of this and that"
- **Change**: Transformed dry analytical descriptions into engaging, story-driven summaries. Avoid formulaic "Analysis of X" patterns in favor of conflict, action verbs, and human interest angles.

## 10/29/25 Cover Image Additions - Complete Audit
- **Comprehensive scan of all posts to ensure cover images are present for all media content**
- **Added covers for:**
  - 10/8/25: The Power of Money book cover
  - 9/16/25: Our Dollar, Your Problem book cover
  - 7/29/25: Hotel Salvation film cover and The Power of Money book cover
  - 10/14/25: Anointed and Replaceable You book covers
  - 8/24/25: World History in Minutes, From Beirut to Jerusalem, The Big Score book covers
  - 8/13/25: Diet, Drugs, and Dopamine book cover
  - 10/4/25: Hardly Strictly Bluegrass festival banner
- **Verified existing covers:**
  - 10/29/25: Welcome film ✓
  - 10/20/25: Sharp Corner film ✓
  - 9/13/25: All We Imagine as Light film ✓
  - 8/26/25: The Seed of the Sacred Fig film ✓
  - 6/20/25: The Animal Kingdom film ✓
  - 5/24/25: A Father's Song music (circular spinning record style) ✓
  - 5/15/25: Holy Spider film ✓
- **Styling notes:**
  - All media images use 60px width with `float: left` and `margin-right: 10px`
  - Music covers use circular styling: `border-radius: 50%; object-fit: cover; height: 60px; animation: spin 3s linear infinite`
  - Multi-book posts use `<br style="clear: both;">` between entries to prevent layout issues
  - All images wrapped in anchor tags linking to specific media.html#slug locations
- **Change**: Ensured 100% coverage of cover images for all media posts across the entire posts.json file.

## 6/5/25 Journal Post Formatting
- **Original**: Informal text "New position $IVES maybe it's time for alternative methods to estimate CPI. AI > human enumerators."
- **Updated**: Separated into two distinct sections with individual icons and titles for IVES investment and CPI thoughts
- **Prompt**: "separate IVES and Journal so its clear they are separate"
- **Change**: Enhanced clarity by visually separating different topics within the journal post

## 6/5/25 Journal Anchor Linking
- **Updated**: Journal link now points to specific entry "prognostication-masturbation"
- **Prompt**: "fix View in Journal link to point to position on page"
- **Change**: Improved navigation by linking directly to the relevant journal entry

## 6/4/25 Multi-Topic Post Formatting
- **Original**: Informal text with emoji "Circle IPO tomorrow. S-1 Sum in '💸' ipo section. Latest TBPS in watch section."
- **Updated**: Removed emoji, added dollar-sign icon, bold title "Circle IPO and Latest TBPS", structured description with separate sections for IPO and podcast
- **Prompt**: "improve 6/4"
- **Change**: Standardized multi-topic post formatting for announcements combining news and media updates

## 6/4/25 News Article Linking
- **Updated**: Changed IPO link from generic news.html to specific article parameter (news.html?article=circle-ipo)
- **Prompt**: "link should point to position in page where Circle article on @news.html"
- **Change**: Enhanced navigation by linking directly to specific news articles

## 6/4/25 TBPS Cover Image
- **Added**: TBPS podcast cover image from media.json with circular styling
- **Prompt**: "TBPS should have cover image from @json/media.json"
- **Change**: Included visual element for podcast announcement to match media post formatting

## 6/4/25 TBPS Anchor Linking
- **Updated**: TBPS link now points to specific media card using anchor
- **Prompt**: "link to TBPS should point to position on @media.html where it is"
- **Change**: Enhanced navigation by linking directly to the TBPS podcast card on media page

## 6/3/25 Journal Post Formatting
- **Original**: Informal investment note "Need to relook at $USAAX, $LSGRX, $NWZMX, $FBCGX, $STCIX, $BDAIX. You know what they had in 2023? $NVDA..."
- **Updated**: Added trending-up icon, bold title "Investment Portfolio Review", structured description with fund list and NVDA context
- **Prompt**: "improve 6/3"
- **Change**: Standardized journal post formatting for personal finance content

## 6/3/25 Ticker Linking
- **Added**: All stock tickers (USAAX, LSGRX, NWZMX, FBCGX, STCIX, BDAIX, NVDA) now link to Yahoo Finance pages
- **Prompt**: "for Tickers make linkable to respective perplexity or yahoo finance page"
- **Change**: Enhanced usability by providing direct access to financial data for mentioned securities

## 6/20/25 The Animal Kingdom Post
- **Original**: Informal text "The Animal Kingdom watch section."
- **Updated**: Added film icon, bold title, description with director and plot, cover image from media.json, and anchored media link
- **Prompt**: Multiple updates for cover and description
- **Change**: Fully standardized media post with all elements: icon, cover, title, description, and navigation

## 5/28/25 Post Deletion
- **Original**: Post about FOMC May Meeting Summary
- **Deleted**: Article referenced in post does not exist
- **Prompt**: "delete it. article doesnt exist"
- **Change**: Removed invalid post to maintain data integrity

## 5/25/25 Feature Update Formatting
- **Original**: Informal text "Rotten Tomatoes and IMDb ratings added to watch section."
- **Updated**: Added star icon, bold title "New Feature: Movie Ratings", expanded description, and consistent link format with filter parameter
- **Prompt**: "now do 5/25"
- **Change**: Standardized feature update posts to match the improved formatting style

## 5/24/25 Music Post Formatting
- **Original**: Informal text with emoji "Allen Stone 🎤 in listen section."
- **Updated**: Added music icon, clickable cover image from media.json, bold title, concise description, and anchor link
- **Prompt**: "lets do same for 5/24"
- **Change**: Standardized music post format to match media post improvements

## 5/24/25 Music Image Styling
- **Updated**: Music post images styled as circular records with spinning animation
- **Prompt**: "can you make music related images look like records (round, spinning)"
- **Change**: Added distinctive visual styling for music posts

## 5/15/25 Post Improvement
- **Original**: Basic text with long description
- **Updated**: Added film icon, bold title, condensed description to 2 sentences, standardized link format
- **Prompt**: "lets go one post at a time. each post needs improvement. lets start with 5/15"
- **Change**: Transformed informal media addition into structured post matching PRD guidelines

## 5/15/25 Cover Image Addition
- **Original**: Text-only post
- **Updated**: Added cover image from media.json with inline styling (60px width, floated left)
- **Prompt**: "use cover image from @json/media.json and add to post/card"
- **Change**: Enhanced visual appeal by including media cover images directly in posts

## 5/15/25 Anchor Linking
- **Original**: Links pointed to top of media.html
- **Updated**: Links and image now point to specific media card using #anchor
- **Prompt**: "the view in media link and clicking on the cover image should point to position on the @media.html where the media is located"
- **Change**: Improved navigation by linking directly to specific media items
