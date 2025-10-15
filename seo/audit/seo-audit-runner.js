/**
 * Comprehensive SEO Audit Runner
 * Executes complete SEO audit and generates detailed reports
 */

class SEOAuditRunner {
    constructor() {
        this.auditResults = {};
        this.startTime = Date.now();
    }

    /**
     * Run comprehensive SEO audit
     * @returns {Promise<Object>} Audit results
     */
    async runComprehensiveAudit() {
        console.log('🔍 Starting Comprehensive SEO Audit...\n');

        try {
            // Run all audit components
            this.auditResults = {
                timestamp: new Date().toISOString(),
                url: window.location.href,
                duration: 0,
                summary: {},
                sections: {}
            };

            // Execute all audit sections
            await this.runTechnicalAudit();
            await this.runContentAudit();
            await this.runPerformanceAudit();
            await this.runMobileAudit();
            await this.runSocialAudit();
            await this.runSchemaAudit();

            // Generate summary
            this.generateSummary();

            // Calculate duration
            this.auditResults.duration = Date.now() - this.startTime;

            // Display results
            this.displayResults();

            return this.auditResults;

        } catch (error) {
            console.error('SEO Audit failed:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString(),
                url: window.location.href
            };
        }
    }

    /**
     * Run technical SEO audit
     */
    async runTechnicalAudit() {
        console.log('🔧 Running Technical SEO Audit...');

        const technical = {
            score: 100,
            issues: [],
            warnings: [],
            passed: [],
            metrics: {}
        };

        // Check HTTP status
        technical.metrics.httpStatus = '200'; // Assume OK for client-side audit

        // Check title tag
        const title = document.title;
        if (!title) {
            technical.score -= 25;
            technical.issues.push('Missing title tag');
        } else if (title.length < 30) {
            technical.score -= 10;
            technical.warnings.push('Title tag too short (< 30 characters)');
        } else if (title.length > 60) {
            technical.score -= 5;
            technical.warnings.push('Title tag too long (> 60 characters)');
        } else {
            technical.passed.push('Title tag length optimal');
        }

        // Check meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            technical.score -= 20;
            technical.issues.push('Missing meta description');
        } else {
            const desc = metaDesc.getAttribute('content') || '';
            if (desc.length < 120) {
                technical.score -= 10;
                technical.warnings.push('Meta description too short (< 120 characters)');
            } else if (desc.length > 160) {
                technical.score -= 5;
                technical.warnings.push('Meta description too long (> 160 characters)');
            } else {
                technical.passed.push('Meta description length optimal');
            }
        }

        // Check canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            technical.score -= 15;
            technical.issues.push('Missing canonical URL');
        } else {
            technical.passed.push('Canonical URL present');
        }

        // Check robots meta
        const robots = document.querySelector('meta[name="robots"]');
        if (!robots) {
            technical.score -= 5;
            technical.warnings.push('Missing robots meta tag');
        } else {
            technical.passed.push('Robots meta tag present');
        }

        // Check HTTPS
        if (window.location.protocol !== 'https:') {
            technical.score -= 20;
            technical.issues.push('Site not using HTTPS');
        } else {
            technical.passed.push('Site uses HTTPS');
        }

        // Check for structured data
        const schemas = document.querySelectorAll('script[type="application/ld+json"]');
        technical.metrics.structuredDataCount = schemas.length;
        if (schemas.length === 0) {
            technical.score -= 15;
            technical.issues.push('No structured data found');
        } else {
            technical.passed.push(`${schemas.length} structured data schemas found`);
        }

        this.auditResults.sections.technical = technical;
    }

    /**
     * Run content SEO audit
     */
    async runContentAudit() {
        console.log('📝 Running Content SEO Audit...');

        const content = {
            score: 100,
            issues: [],
            warnings: [],
            passed: [],
            metrics: {}
        };

        // Check H1 tag
        const h1Tags = document.querySelectorAll('h1');
        content.metrics.h1Count = h1Tags.length;
        if (h1Tags.length === 0) {
            content.score -= 20;
            content.issues.push('Missing H1 tag');
        } else if (h1Tags.length > 1) {
            content.score -= 10;
            content.warnings.push('Multiple H1 tags found');
        } else {
            content.passed.push('Single H1 tag present');
        }

        // Check heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        content.metrics.totalHeadings = headings.length;
        let hierarchyIssues = 0;
        for (let i = 1; i < headings.length; i++) {
            const current = parseInt(headings[i].tagName.charAt(1));
            const previous = parseInt(headings[i - 1].tagName.charAt(1));
            if (current > previous + 1) {
                hierarchyIssues++;
            }
        }
        if (hierarchyIssues > 0) {
            content.score -= Math.min(hierarchyIssues * 5, 20);
            content.warnings.push(`${hierarchyIssues} heading hierarchy issues`);
        } else {
            content.passed.push('Heading hierarchy correct');
        }

        // Check content length
        const textContent = document.body.textContent || '';
        const wordCount = textContent.split(/\s+/).length;
        content.metrics.wordCount = wordCount;
        if (wordCount < 300) {
            content.score -= 15;
            content.warnings.push('Content appears short (< 300 words)');
        } else {
            content.passed.push(`Good content length (${wordCount} words)`);
        }

        // Check images
        const images = document.querySelectorAll('img');
        content.metrics.imageCount = images.length;
        let imagesWithoutAlt = 0;
        images.forEach(img => {
            if (!img.getAttribute('alt')) {
                imagesWithoutAlt++;
            }
        });
        if (imagesWithoutAlt > 0) {
            content.score -= Math.min(imagesWithoutAlt * 10, 40);
            content.issues.push(`${imagesWithoutAlt} images missing alt text`);
        } else if (images.length > 0) {
            content.passed.push('All images have alt text');
        }

        this.auditResults.sections.content = content;
    }

    /**
     * Run performance audit
     */
    async runPerformanceAudit() {
        console.log('⚡ Running Performance Audit...');

        const performance = {
            score: 100,
            issues: [],
            warnings: [],
            passed: [],
            metrics: {}
        };

        // Check Core Web Vitals (if available)
        if (window.performance && window.performance.getEntriesByType) {
            const navigation = window.performance.getEntriesByType('navigation')[0];
            if (navigation) {
                const loadTime = navigation.loadEventEnd - navigation.fetchStart;
                performance.metrics.pageLoadTime = loadTime;
                if (loadTime > 3000) {
                    performance.score -= 20;
                    performance.issues.push(`Slow page load time: ${loadTime}ms`);
                } else {
                    performance.passed.push(`Good page load time: ${loadTime}ms`);
                }
            }
        }

        // Check render-blocking resources
        const renderBlockingCSS = document.querySelectorAll('link[rel="stylesheet"]:not([media="print"])');
        performance.metrics.renderBlockingCSS = renderBlockingCSS.length;
        if (renderBlockingCSS.length > 3) {
            performance.score -= 10;
            performance.warnings.push(`${renderBlockingCSS.length} render-blocking CSS files`);
        } else {
            performance.passed.push('Render-blocking CSS optimized');
        }

        // Check image optimization
        const images = document.querySelectorAll('img');
        let optimizedImages = 0;
        images.forEach(img => {
            if (img.hasAttribute('loading') || img.hasAttribute('srcset')) {
                optimizedImages++;
            }
        });
        performance.metrics.optimizedImages = optimizedImages;
        if (images.length > 0) {
            const optimizationRate = (optimizedImages / images.length) * 100;
            if (optimizationRate < 50) {
                performance.score -= 15;
                performance.warnings.push(`Low image optimization rate: ${optimizationRate.toFixed(1)}%`);
            } else {
                performance.passed.push(`Good image optimization: ${optimizationRate.toFixed(1)}%`);
            }
        }

        this.auditResults.sections.performance = performance;
    }

    /**
     * Run mobile SEO audit
     */
    async runMobileAudit() {
        console.log('📱 Running Mobile SEO Audit...');

        const mobile = {
            score: 100,
            issues: [],
            warnings: [],
            passed: [],
            metrics: {}
        };

        // Check viewport
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            mobile.score -= 30;
            mobile.issues.push('Missing viewport meta tag');
        } else {
            const content = viewport.getAttribute('content');
            if (content && content.includes('width=device-width')) {
                mobile.passed.push('Proper viewport configuration');
            } else {
                mobile.score -= 20;
                mobile.issues.push('Improper viewport configuration');
            }
        }

        // Check touch targets
        const interactive = document.querySelectorAll('button, a, input, select, textarea');
        mobile.metrics.interactiveElements = interactive.length;
        let smallTargets = 0;
        interactive.forEach(el => {
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            if (width < 44 || height < 44) {
                smallTargets++;
            }
        });
        if (smallTargets > 0) {
            mobile.score -= Math.min(smallTargets * 5, 25);
            mobile.issues.push(`${smallTargets} touch targets too small (< 44px)`);
        } else if (interactive.length > 0) {
            mobile.passed.push('All touch targets meet minimum size');
        }

        // Check font sizes
        const textElements = document.querySelectorAll('*');
        let smallText = 0;
        textElements.forEach(el => {
            const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
            if (fontSize > 0 && fontSize < 14 && el.textContent.trim()) {
                smallText++;
            }
        });
        if (smallText > 10) {
            mobile.score -= 10;
            mobile.warnings.push('Some text may be too small for mobile');
        } else {
            mobile.passed.push('Text sizes appropriate for mobile');
        }

        this.auditResults.sections.mobile = mobile;
    }

    /**
     * Run social media audit
     */
    async runSocialAudit() {
        console.log('📢 Running Social Media Audit...');

        const social = {
            score: 100,
            issues: [],
            warnings: [],
            passed: [],
            metrics: {}
        };

        // Check Open Graph tags
        const ogTags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
        let ogPresent = 0;
        ogTags.forEach(tag => {
            if (document.querySelector(`meta[property="${tag}"]`)) {
                ogPresent++;
            }
        });
        social.metrics.ogTagsPresent = ogPresent;
        if (ogPresent < ogTags.length) {
            social.score -= (ogTags.length - ogPresent) * 3;
            social.warnings.push(`${ogTags.length - ogPresent} Open Graph tags missing`);
        } else {
            social.passed.push('Complete Open Graph implementation');
        }

        // Check Twitter Card tags
        const twitterTags = ['twitter:card', 'twitter:title', 'twitter:description'];
        let twitterPresent = 0;
        twitterTags.forEach(tag => {
            if (document.querySelector(`meta[name="${tag}"]`)) {
                twitterPresent++;
            }
        });
        social.metrics.twitterTagsPresent = twitterPresent;
        if (twitterPresent < twitterTags.length) {
            social.score -= (twitterTags.length - twitterPresent) * 2;
            social.warnings.push(`${twitterTags.length - twitterPresent} Twitter Card tags missing`);
        } else {
            social.passed.push('Complete Twitter Card implementation');
        }

        this.auditResults.sections.social = social;
    }

    /**
     * Run structured data audit
     */
    async runSchemaAudit() {
        console.log('🏗️ Running Structured Data Audit...');

        const schema = {
            score: 100,
            issues: [],
            warnings: [],
            passed: [],
            metrics: {}
        };

        const schemas = document.querySelectorAll('script[type="application/ld+json"]');
        schema.metrics.totalSchemas = schemas.length;

        if (schemas.length === 0) {
            schema.score -= 30;
            schema.issues.push('No structured data found');
            this.auditResults.sections.schema = schema;
            return;
        }

        let validSchemas = 0;
        let parseErrors = 0;

        schemas.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                if (data['@context'] && data['@type']) {
                    validSchemas++;
                    // Basic validation based on schema type
                    const validation = this.validateSchema(data);
                    if (!validation.valid) {
                        schema.score -= 5;
                        schema.warnings.push(`${data['@type']} schema: ${validation.issues.join(', ')}`);
                    }
                } else {
                    schema.score -= 10;
                    schema.warnings.push('Schema missing @context or @type');
                }
            } catch (error) {
                parseErrors++;
                schema.score -= 15;
                schema.issues.push('Invalid JSON in structured data');
            }
        });

        schema.metrics.validSchemas = validSchemas;
        schema.metrics.parseErrors = parseErrors;

        if (parseErrors > 0) {
            schema.issues.push(`${parseErrors} schemas have JSON parsing errors`);
        }

        if (validSchemas > 0) {
            schema.passed.push(`${validSchemas} valid schemas found`);
        }

        this.auditResults.sections.schema = schema;
    }

    /**
     * Validate individual schema
     * @param {Object} schema - Schema data
     * @returns {Object} Validation result
     */
    validateSchema(schema) {
        const result = { valid: true, issues: [] };

        switch (schema['@type']) {
            case 'Article':
            case 'BlogPosting':
                if (!schema.headline) result.issues.push('Missing headline');
                if (!schema.author) result.issues.push('Missing author');
                if (!schema.datePublished) result.issues.push('Missing publication date');
                break;
            case 'Organization':
                if (!schema.name) result.issues.push('Missing name');
                break;
            case 'WebSite':
                if (!schema.name) result.issues.push('Missing name');
                break;
        }

        result.valid = result.issues.length === 0;
        return result;
    }

    /**
     * Generate audit summary
     */
    generateSummary() {
        const sections = this.auditResults.sections;
        const scores = Object.values(sections).map(s => s.score);
        const totalScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;

        // Count total issues
        let totalIssues = 0;
        let totalWarnings = 0;
        let totalPassed = 0;

        Object.values(sections).forEach(section => {
            totalIssues += section.issues.length;
            totalWarnings += section.warnings.length;
            totalPassed += section.passed.length;
        });

        this.auditResults.summary = {
            overallScore: totalScore,
            grade: this.getGrade(totalScore),
            totalIssues,
            totalWarnings,
            totalPassed,
            sectionsCount: Object.keys(sections).length
        };
    }

    /**
     * Get grade based on score
     * @param {number} score - Score (0-100)
     * @returns {string} Grade
     */
    getGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Display audit results
     */
    displayResults() {
        const summary = this.auditResults.summary;

        console.log('\n🎯 COMPREHENSIVE SEO AUDIT RESULTS');
        console.log('=' .repeat(50));
        console.log(`Overall Score: ${summary.overallScore}/100 (Grade: ${summary.grade})`);
        console.log(`Duration: ${this.auditResults.duration}ms`);
        console.log(`URL: ${this.auditResults.url}`);
        console.log(`Timestamp: ${this.auditResults.timestamp}`);
        console.log('');

        console.log('📊 SUMMARY:');
        console.log(`  ✅ Passed Checks: ${summary.totalPassed}`);
        console.log(`  ⚠️  Warnings: ${summary.totalWarnings}`);
        console.log(`  ❌ Issues: ${summary.totalIssues}`);
        console.log('');

        // Display section results
        Object.entries(this.auditResults.sections).forEach(([sectionName, section]) => {
            const grade = this.getGrade(section.score);
            console.log(`🔍 ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} SEO (${section.score}/100 - ${grade})`);

            if (section.passed.length > 0) {
                console.log('  ✅ PASSED:');
                section.passed.forEach(item => console.log(`    • ${item}`));
            }

            if (section.warnings.length > 0) {
                console.log('  ⚠️  WARNINGS:');
                section.warnings.forEach(item => console.log(`    • ${item}`));
            }

            if (section.issues.length > 0) {
                console.log('  ❌ ISSUES:');
                section.issues.forEach(item => console.log(`    • ${item}`));
            }

            if (section.metrics && Object.keys(section.metrics).length > 0) {
                console.log('  📈 METRICS:');
                Object.entries(section.metrics).forEach(([key, value]) => {
                    console.log(`    • ${key}: ${value}`);
                });
            }

            console.log('');
        });

        // Recommendations
        this.displayRecommendations();
    }

    /**
     * Display recommendations
     */
    displayRecommendations() {
        console.log('💡 RECOMMENDATIONS:');

        const summary = this.auditResults.summary;

        if (summary.overallScore >= 90) {
            console.log('  🎉 Excellent! Your SEO implementation is outstanding.');
            console.log('  📈 Focus on maintaining current performance and monitoring for regressions.');
        } else if (summary.overallScore >= 80) {
            console.log('  ✅ Good job! Address the remaining issues to achieve excellence.');
        } else if (summary.overallScore >= 70) {
            console.log('  ⚠️ Decent performance. Prioritize fixing critical issues.');
        } else {
            console.log('  🚨 Significant improvements needed. Focus on critical issues first.');
        }

        if (summary.totalIssues > 0) {
            console.log('\n  🔧 PRIORITY FIXES:');
            // Show top issues across sections
            const allIssues = [];
            Object.values(this.auditResults.sections).forEach(section => {
                section.issues.forEach(issue => allIssues.push(issue));
            });
            allIssues.slice(0, 5).forEach(issue => console.log(`    • ${issue}`));
        }

        console.log('\n  🛠️ TOOLS & MONITORING:');
        console.log('    • Run automated audits regularly using the SEO monitor');
        console.log('    • Use browser dev tools to check Core Web Vitals');
        console.log('    • Test on multiple devices and screen sizes');
        console.log('    • Validate structured data with Google\'s Rich Results Test');

        console.log('\n  📚 RESOURCES:');
        console.log('    • Google Search Console: https://search.google.com/search-console');
        console.log('    • Google PageSpeed Insights: https://pagespeed.web.dev');
        console.log('    • Schema.org Documentation: https://schema.org');
    }

    /**
     * Export audit results as JSON
     * @returns {string} JSON string
     */
    exportResults() {
        return JSON.stringify(this.auditResults, null, 2);
    }

    /**
     * Get audit score for a specific section
     * @param {string} sectionName - Section name
     * @returns {number} Section score
     */
    getSectionScore(sectionName) {
        const section = this.auditResults.sections[sectionName];
        return section ? section.score : 0;
    }

    /**
     * Check if audit passed minimum standards
     * @returns {boolean} Whether audit passed
     */
    passedMinimumStandards() {
        return this.auditResults.summary.overallScore >= 70;
    }
}

// Export for use in modules
export default SEOAuditRunner;

// Make available globally
if (typeof window !== 'undefined') {
    window.SEOAuditRunner = SEOAuditRunner;
}
