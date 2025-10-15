/**
 * Content Schema Generator
 * Generates structured data for different content types
 */

class ContentSchemaGenerator {
    constructor() {
        this.baseSchema = {
            "@context": "https://schema.org",
            "@type": null
        };
    }

    /**
     * Generate Article schema for news/blog posts
     * @param {Object} articleData - Article data
     * @returns {Object} Article schema
     */
    generateArticleSchema(articleData) {
        const schema = {
            ...this.baseSchema,
            "@type": "Article",
            "headline": articleData.headline || articleData.title,
            "description": articleData.description || articleData.excerpt,
            "datePublished": articleData.datePublished || articleData.date,
            "dateModified": articleData.dateModified || articleData.datePublished || articleData.date,
            "author": this.generateAuthorSchema(articleData.author),
            "publisher": this.generatePublisherSchema(),
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": window.location.href
            },
            "articleSection": articleData.category || articleData.section,
            "keywords": articleData.tags || articleData.keywords || []
        };

        // Add image if available
        if (articleData.image || articleData.cover) {
            schema.image = {
                "@type": "ImageObject",
                "url": articleData.image || articleData.cover,
                "width": articleData.imageWidth || 1200,
                "height": articleData.imageHeight || 630
            };
        }

        // Add word count if available
        if (articleData.wordCount) {
            schema.wordCount = articleData.wordCount;
        }

        // Add time to read if available
        if (articleData.timeToRead) {
            schema.timeRequired = `PT${articleData.timeToRead}M`;
        }

        return schema;
    }

    /**
     * Generate BlogPosting schema
     * @param {Object} blogData - Blog post data
     * @returns {Object} BlogPosting schema
     */
    generateBlogPostingSchema(blogData) {
        const schema = {
            ...this.baseSchema,
            "@type": "BlogPosting",
            "headline": blogData.headline || blogData.title,
            "description": blogData.description || blogData.excerpt,
            "datePublished": blogData.datePublished || blogData.date,
            "dateModified": blogData.dateModified || blogData.datePublished || blogData.date,
            "author": this.generateAuthorSchema(blogData.author),
            "publisher": this.generatePublisherSchema(),
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": window.location.href
            },
            "articleSection": blogData.category || "Journal",
            "keywords": blogData.tags || blogData.keywords || []
        };

        // Add image if available
        if (blogData.image || blogData.cover) {
            schema.image = {
                "@type": "ImageObject",
                "url": blogData.image || blogData.cover
            };
        }

        // Add blog specific properties
        if (blogData.entries && Array.isArray(blogData.entries)) {
            schema.articleBody = blogData.entries.map(entry =>
                `${entry.title}\n${entry.content}`
            ).join('\n\n');
        }

        return schema;
    }

    /**
     * Generate MediaObject schema for various media types
     * @param {Object} mediaData - Media data
     * @returns {Object} MediaObject schema
     */
    generateMediaObjectSchema(mediaData) {
        let mediaType = "MediaObject";

        // Determine specific media type
        switch (mediaData.mediaType) {
            case 'movie':
                mediaType = "Movie";
                break;
            case 'book':
                mediaType = "Book";
                break;
            case 'song':
            case 'playlist':
                mediaType = "MusicRecording";
                break;
            case 'podcast':
                mediaType = "PodcastEpisode";
                break;
            case 'video':
                mediaType = "VideoObject";
                break;
            case 'article':
                return this.generateArticleSchema(mediaData);
        }

        const schema = {
            ...this.baseSchema,
            "@type": mediaType,
            "name": mediaData.title,
            "description": mediaData.description,
            "datePublished": mediaData.date || mediaData.dateAdded,
            "author": this.generateAuthorSchema(mediaData.author),
            "publisher": this.generatePublisherSchema()
        };

        // Add media-specific properties
        if (mediaData.cover || mediaData.image) {
            schema.image = {
                "@type": "ImageObject",
                "url": mediaData.cover || mediaData.image,
                "name": `Cover image for ${mediaData.title}`
            };
        }

        // Add URLs and embeds
        if (mediaData.embedUrl) {
            schema.embedUrl = mediaData.embedUrl;
        }

        if (mediaData.links && Array.isArray(mediaData.links)) {
            schema.sameAs = mediaData.links.map(link => link.url);
        }

        // Add rating if available
        if (mediaData.rating) {
            schema.aggregateRating = {
                "@type": "AggregateRating",
                "ratingValue": mediaData.rating,
                "bestRating": 5,
                "worstRating": 1
            };
        }

        // Movie-specific properties
        if (mediaType === "Movie" && mediaData.ratings) {
            if (mediaData.ratings.imdb) {
                schema.sameAs = schema.sameAs || [];
                schema.sameAs.push(mediaData.ratings.imdb.url);
            }
            if (mediaData.ratings.rt) {
                schema.sameAs = schema.sameAs || [];
                schema.sameAs.push(mediaData.ratings.rt.url);
            }
        }

        // Book-specific properties
        if (mediaType === "Book") {
            schema.bookFormat = "EBook"; // Assuming digital format
            if (mediaData.status && mediaData.status.toLowerCase().includes('reading')) {
                schema.readingProgress = "CurrentlyReading";
            }
        }

        // Music-specific properties
        if (mediaType === "MusicRecording") {
            if (mediaData.mediaType === 'playlist') {
                schema["@type"] = "MusicPlaylist";
                schema.numTracks = mediaData.trackCount || 0;
            }
        }

        return schema;
    }

    /**
     * Generate author schema
     * @param {Object|string} author - Author data
     * @returns {Object} Author schema
     */
    generateAuthorSchema(author) {
        if (!author) {
            return {
                "@type": "Person",
                "name": "Ben Palmer"
            };
        }

        if (typeof author === 'string') {
            return {
                "@type": "Person",
                "name": author
            };
        }

        return {
            "@type": "Person",
            "name": author.name || "Ben Palmer",
            "url": author.url,
            "sameAs": author.socialProfiles || []
        };
    }

    /**
     * Generate publisher schema
     * @returns {Object} Publisher schema
     */
    generatePublisherSchema() {
        return {
            "@type": "Organization",
            "name": "Howdy, Stranger",
            "url": "https://howdystranger.net",
            "logo": {
                "@type": "ImageObject",
                "url": "https://howdystranger.net/images/logo.png",
                "width": 360,
                "height": 360
            },
            "sameAs": [
                "https://twitter.com/DocRiter",
                "https://www.youtube.com/@BenPalmerShow",
                "https://benpalmershow.substack.com"
            ]
        };
    }

    /**
     * Inject schema into page
     * @param {Object} schema - Schema object to inject
     * @param {string} identifier - Unique identifier for the schema
     */
    injectSchema(schema, identifier = 'content-schema') {
        // Remove existing schema with same identifier
        const existingSchema = document.querySelector(`script[data-schema-id="${identifier}"]`);
        if (existingSchema) {
            existingSchema.remove();
        }

        // Create new script element
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-schema-id', identifier);
        script.textContent = JSON.stringify(schema, null, 2);

        // Insert before first existing schema or at end of head
        const firstSchema = document.querySelector('script[type="application/ld+json"]');
        if (firstSchema) {
            firstSchema.parentNode.insertBefore(script, firstSchema);
        } else {
            document.head.appendChild(script);
        }

        console.log(`Schema injected for ${identifier}:`, schema["@type"]);
    }

    /**
     * Generate schema for post data (from posts-loader)
     * @param {Object} post - Post data
     * @param {string} category - Detected category
     * @returns {Object} Article schema
     */
    generatePostSchema(post, category) {
        const postData = {
            headline: `News: ${post.content.substring(0, 100)}...`,
            description: post.content.substring(0, 160),
            datePublished: post.date,
            author: "Ben Palmer",
            category: category || "News",
            tags: [category],
            wordCount: post.content.split(/\s+/).length
        };

        return this.generateArticleSchema(postData);
    }

    /**
     * Generate schema for journal entry
     * @param {Object} journalEntry - Journal entry data
     * @returns {Object} BlogPosting schema
     */
    generateJournalSchema(journalEntry) {
        const journalData = {
            headline: journalEntry.entries && journalEntry.entries.length > 0 ?
                journalEntry.entries[0].title : `Journal Entry - ${journalEntry.date}`,
            description: journalEntry.entries && journalEntry.entries.length > 0 ?
                journalEntry.entries[0].content.substring(0, 160) : "Personal insights and commentary",
            datePublished: journalEntry.date,
            author: "Ben Palmer",
            category: "Journal",
            entries: journalEntry.entries
        };

        return this.generateBlogPostingSchema(journalData);
    }

    /**
     * Generate schema for media item
     * @param {Object} mediaItem - Media item data
     * @returns {Object} MediaObject schema
     */
    generateMediaItemSchema(mediaItem) {
        return this.generateMediaObjectSchema(mediaItem);
    }
}

// Export for use in modules
export default ContentSchemaGenerator;
