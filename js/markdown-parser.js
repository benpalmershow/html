// Markdown parser with frontmatter support
async function loadArticle(file) {
  const response = await fetch(`article/${file}`);
  const text = await response.text();
  const parts = text.split('---');
  if (parts.length < 3) throw new Error('Invalid frontmatter');
  const frontmatterText = parts[1].trim();
  const body = parts.slice(2).join('---').trim();

  const metadata = {};
  frontmatterText.split('\n').forEach(line => {
    if (line.trim()) {
      const colonIndex = line.indexOf(': ');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 2).trim();
        metadata[key] = value;
      }
    }
  });

  const html = marked.parse(body);
  return { metadata, html };
}

async function loadAllArticles() {
  const articleFiles = [
    'urban_crime_2020.md',
    'chiles-v-salazar.md'
  ];

  const articles = await Promise.all(
    articleFiles.map(async (file) => {
      const article = await loadArticle(file);
      return {
        id: file.replace('.md', ''),
        ...article.metadata
      };
    })
  );

  // Sort by date
  return articles.sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );
}