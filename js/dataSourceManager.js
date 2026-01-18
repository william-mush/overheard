// Data Source Manager - Fetches live data from various sources

export class DataSourceManager {
    constructor() {
        this.listeners = [];
        this.sources = [
            // Tech & Code
            new HackerNewsSource(),
            new RedditSource(),
            new DevToSource(),
            new GitHubTrendingSource(),
            new StackOverflowSource(),
            new ProductHuntSource(),
            new MediumSource(),

            // Social & Content
            new MastodonSource(),
            new YouTubeSource(),
            new LobstersSource(),
            new SlashdotSource(),
            new ArxivSource(),
            new PubMedSource(),

            // News - International
            new BBCNewsSource(),
            new GuardianSource(),
            new ReutersSource(),
            new AlJazeeraSource(),
            new NPRSource(),
            new DWSource(),
            new France24Source(),
            new ABCAustraliaSource(),
            new CNNSource(),

            // News - Local/Regional
            new LocalNewspaperSource(),

            // Finance & Crypto
            new CryptoSource(),
            new CoinDeskSource(),
            new CryptoCompareSource(),

            // Weather & Environment
            new WeatherSource(),
            new EarthquakeSource(),
            new NASASource(),
            new SpaceNewsSource(),

            // Generic News API (fallback)
            new NewsAPISource()
        ];
        this.updateInterval = 5000; // 5 seconds - even slower for typewriter readability
        this.isRunning = false;
    }

    async initialize() {
        console.log('Initializing data sources...');

        // Initialize all sources
        await Promise.all(this.sources.map(source => source.initialize()));

        // Start fetching
        this.startFetching();
    }

    startFetching() {
        this.isRunning = true;

        // Immediate first fetch
        this.fetchAll();

        // Set up interval
        this.intervalId = setInterval(() => {
            this.fetchAll();
        }, this.updateInterval);
    }

    stopFetching() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    async fetchAll() {
        // Fetch from multiple sources simultaneously each cycle
        const sourcesToFetch = [];

        // Randomly select 5-8 sources to fetch from each cycle for variety
        const numSources = Math.floor(Math.random() * 4) + 5;
        const shuffled = [...this.sources].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(numSources, shuffled.length); i++) {
            sourcesToFetch.push(shuffled[i]);
        }

        // Fetch all selected sources in parallel
        const promises = sourcesToFetch.map(async (source) => {
            try {
                const items = await source.fetch();
                items.forEach(item => this.emit('newData', item));
            } catch (error) {
                console.error(`Error fetching from ${source.name}:`, error);
            }
        });

        await Promise.all(promises);
    }

    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    emit(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
    }
}

// Hacker News Source
class HackerNewsSource {
    constructor() {
        this.name = 'Hacker News';
        this.lastId = 0;
        this.apiUrl = 'https://hacker-news.firebaseio.com/v0';
    }

    async initialize() {
        // Get latest item ID
        const response = await fetch(`${this.apiUrl}/maxitem.json`);
        this.lastId = await response.json();
    }

    async fetch() {
        const items = [];

        try {
            // Get latest items
            const response = await fetch(`${this.apiUrl}/newstories.json`);
            const storyIds = await response.json();

            // Fetch 10 stories for more content
            for (let i = 0; i < 10; i++) {
                const id = storyIds[Math.floor(Math.random() * Math.min(50, storyIds.length))];
                const itemResponse = await fetch(`${this.apiUrl}/item/${id}.json`);
                const item = await itemResponse.json();

                if (item && item.title) {
                    items.push({
                        source: 'Hacker News',
                        content: item.title,
                        timestamp: Date.now(),
                        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
                        score: item.score
                    });
                }
            }
        } catch (error) {
            console.error('HN fetch error:', error);
        }

        return items;
    }
}

// Reddit Source
class RedditSource {
    constructor() {
        this.name = 'Reddit';
        this.subreddits = ['programming', 'technology', 'worldnews', 'science', 'todayilearned'];
    }

    async initialize() {
        // No initialization needed
    }

    async fetch() {
        const items = [];

        try {
            // Pick random subreddit
            const sub = this.subreddits[Math.floor(Math.random() * this.subreddits.length)];
            const response = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`);
            const data = await response.json();

            // Get 10 posts
            for (let i = 0; i < 10; i++) {
                const post = data.data.children[Math.floor(Math.random() * Math.min(25, data.data.children.length))].data;
                items.push({
                    source: `r/${sub}`,
                    content: post.title,
                    timestamp: Date.now(),
                    url: `https://reddit.com${post.permalink}`,
                    score: post.score
                });
            }
        } catch (error) {
            console.error('Reddit fetch error:', error);
        }

        return items;
    }
}

// News API Source (using free tier with top headlines)
class NewsAPISource {
    constructor() {
        this.name = 'News';
        this.categories = ['technology', 'science', 'business'];
        // Note: For production, you'll need to add your API key
        this.apiKey = 'YOUR_NEWS_API_KEY';
        this.useMock = true; // Set to false when you have an API key
    }

    async initialize() {
        // Check if API key is set
        if (this.apiKey === 'YOUR_NEWS_API_KEY') {
            console.log('News API: Using mock data (no API key set)');
            this.useMock = true;
        }
    }

    async fetch() {
        if (this.useMock) {
            return this.getMockNews();
        }

        const items = [];

        try {
            const category = this.categories[Math.floor(Math.random() * this.categories.length)];
            const response = await fetch(
                `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=5&apiKey=${this.apiKey}`
            );
            const data = await response.json();

            if (data.articles) {
                const article = data.articles[Math.floor(Math.random() * data.articles.length)];
                items.push({
                    source: article.source.name,
                    content: article.title,
                    timestamp: Date.now(),
                    url: article.url
                });
            }
        } catch (error) {
            console.error('News API fetch error:', error);
        }

        return items;
    }

    getMockNews() {
        const mockHeadlines = [
            { source: 'Tech News', content: 'New AI breakthrough in natural language processing announced' },
            { source: 'Science Daily', content: 'Researchers discover new exoplanet in habitable zone' },
            { source: 'Business Wire', content: 'Tech giant announces major investment in quantum computing' },
            { source: 'Innovation Today', content: 'Revolutionary battery technology promises 10x capacity' },
            { source: 'Space News', content: 'Mars rover discovers potential signs of ancient microbial life' }
        ];

        const headline = mockHeadlines[Math.floor(Math.random() * mockHeadlines.length)];
        return [{
            source: headline.source,
            content: headline.content,
            timestamp: Date.now(),
            url: '#'
        }];
    }
}

// Dev.to Source
class DevToSource {
    constructor() {
        this.name = 'Dev.to';
    }

    async initialize() {
        // No initialization needed
    }

    async fetch() {
        const items = [];

        try {
            const response = await fetch('https://dev.to/api/articles?per_page=10&top=1');
            const articles = await response.json();

            // Get 2 random articles
            for (let i = 0; i < 2; i++) {
                const article = articles[Math.floor(Math.random() * articles.length)];
                items.push({
                    source: 'DEV',
                    content: article.title,
                    timestamp: Date.now(),
                    url: article.url,
                    reactions: article.positive_reactions_count
                });
            }
        } catch (error) {
            console.error('Dev.to fetch error:', error);
        }

        return items;
    }
}

// GitHub Trending Source
class GitHubTrendingSource {
    constructor() {
        this.name = 'GitHub';
    }

    async initialize() {
        // No initialization needed
    }

    async fetch() {
        const items = [];

        try {
            // Using GitHub API to get trending repos (via search for recently starred)
            const date = new Date();
            date.setDate(date.getDate() - 7);
            const dateStr = date.toISOString().split('T')[0];

            const response = await fetch(
                `https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=10`
            );
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const repo = data.items[Math.floor(Math.random() * Math.min(5, data.items.length))];
                items.push({
                    source: 'GitHub',
                    content: `${repo.full_name}: ${repo.description || 'No description'}`,
                    timestamp: Date.now(),
                    url: repo.html_url,
                    stars: repo.stargazers_count
                });
            }
        } catch (error) {
            console.error('GitHub fetch error:', error);
        }

        return items;
    }
}

// Stack Overflow Source
class StackOverflowSource {
    constructor() {
        this.name = 'Stack Overflow';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://api.stackexchange.com/2.3/questions?order=desc&sort=activity&site=stackoverflow&pagesize=10');
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const question = data.items[Math.floor(Math.random() * Math.min(5, data.items.length))];
                items.push({
                    source: 'Stack Overflow',
                    content: question.title,
                    timestamp: Date.now(),
                    url: question.link,
                    score: question.score
                });
            }
        } catch (error) {
            console.error('Stack Overflow fetch error:', error);
        }
        return items;
    }
}

// Product Hunt Source
class ProductHuntSource {
    constructor() {
        this.name = 'Product Hunt';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            // Using public GraphQL endpoint
            const response = await fetch('https://www.producthunt.com/frontend/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `{
                        posts(first: 10, order: VOTES) {
                            edges {
                                node {
                                    name
                                    tagline
                                    votesCount
                                    url
                                }
                            }
                        }
                    }`
                })
            });
            const data = await response.json();

            if (data.data?.posts?.edges?.length > 0) {
                const post = data.data.posts.edges[Math.floor(Math.random() * Math.min(5, data.data.posts.edges.length))].node;
                items.push({
                    source: 'Product Hunt',
                    content: `${post.name} - ${post.tagline}`,
                    timestamp: Date.now(),
                    url: post.url,
                    votes: post.votesCount
                });
            }
        } catch (error) {
            console.error('Product Hunt fetch error:', error);
        }
        return items;
    }
}

// Medium Source
class MediumSource {
    constructor() {
        this.name = 'Medium';
        this.topics = ['programming', 'technology', 'artificial-intelligence', 'data-science', 'software-engineering'];
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const topic = this.topics[Math.floor(Math.random() * this.topics.length)];
            const response = await fetch(`https://medium.com/tag/${topic}?format=json`);
            const text = await response.text();
            // Medium prepends ])}while(1);</x> to JSON responses
            const json = JSON.parse(text.replace(/^\]\)\}while\(1\);<x>/, ''));

            const posts = json.payload?.references?.Post;
            if (posts) {
                const postArray = Object.values(posts);
                const post = postArray[Math.floor(Math.random() * Math.min(5, postArray.length))];
                items.push({
                    source: 'Medium',
                    content: post.title,
                    timestamp: Date.now(),
                    url: `https://medium.com/p/${post.id}`
                });
            }
        } catch (error) {
            console.error('Medium fetch error:', error);
        }
        return items;
    }
}

// Mastodon Source
class MastodonSource {
    constructor() {
        this.name = 'Mastodon';
        this.instances = ['mastodon.social', 'fosstodon.org', 'techhub.social'];
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const instance = this.instances[Math.floor(Math.random() * this.instances.length)];
            const response = await fetch(`https://${instance}/api/v1/timelines/public?limit=20`);
            const toots = await response.json();

            if (toots && toots.length > 0) {
                const toot = toots[Math.floor(Math.random() * Math.min(10, toots.length))];
                const content = toot.content.replace(/<[^>]*>/g, '').substring(0, 200);
                items.push({
                    source: `Mastodon (${instance})`,
                    content,
                    timestamp: Date.now(),
                    url: toot.url
                });
            }
        } catch (error) {
            console.error('Mastodon fetch error:', error);
        }
        return items;
    }
}

// YouTube Source
class YouTubeSource {
    constructor() {
        this.name = 'YouTube';
        this.apiKey = 'YOUR_YOUTUBE_API_KEY';
        this.useMock = true;
    }

    async initialize() {
        if (this.apiKey === 'YOUR_YOUTUBE_API_KEY') {
            this.useMock = true;
        }
    }

    async fetch() {
        if (this.useMock) {
            return this.getMockVideos();
        }

        const items = [];
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=10&regionCode=US&key=${this.apiKey}`
            );
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const video = data.items[Math.floor(Math.random() * data.items.length)];
                items.push({
                    source: 'YouTube',
                    content: video.snippet.title,
                    timestamp: Date.now(),
                    url: `https://www.youtube.com/watch?v=${video.id}`
                });
            }
        } catch (error) {
            console.error('YouTube fetch error:', error);
        }
        return items;
    }

    getMockVideos() {
        const mockVideos = [
            { content: 'How AI is Changing Software Development in 2025' },
            { content: 'Top 10 Programming Languages to Learn This Year' },
            { content: 'Building a Web App in 10 Minutes' },
            { content: 'The Future of Cloud Computing' },
            { content: 'Debugging Like a Pro: Advanced Tips' }
        ];
        const video = mockVideos[Math.floor(Math.random() * mockVideos.length)];
        return [{
            source: 'YouTube',
            content: video.content,
            timestamp: Date.now(),
            url: '#'
        }];
    }
}

// BBC News Source
class BBCNewsSource {
    constructor() {
        this.name = 'BBC News';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://feeds.bbci.co.uk/news/world/rss.xml');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: 'BBC News',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('BBC News fetch error:', error);
        }
        return items;
    }
}

// The Guardian Source
class GuardianSource {
    constructor() {
        this.name = 'The Guardian';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://www.theguardian.com/world/rss');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: 'The Guardian',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('Guardian fetch error:', error);
        }
        return items;
    }
}

// Reuters Source
class ReutersSource {
    constructor() {
        this.name = 'Reuters';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: 'Reuters',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('Reuters fetch error:', error);
        }
        return items;
    }
}

// Al Jazeera Source
class AlJazeeraSource {
    constructor() {
        this.name = 'Al Jazeera';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://www.aljazeera.com/xml/rss/all.xml');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: 'Al Jazeera',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('Al Jazeera fetch error:', error);
        }
        return items;
    }
}

// NPR Source
class NPRSource {
    constructor() {
        this.name = 'NPR';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://feeds.npr.org/1001/rss.xml');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: 'NPR',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('NPR fetch error:', error);
        }
        return items;
    }
}

// Deutsche Welle Source
class DWSource {
    constructor() {
        this.name = 'Deutsche Welle';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://rss.dw.com/xml/rss-en-all');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: 'Deutsche Welle',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('DW fetch error:', error);
        }
        return items;
    }
}

// France24 Source
class France24Source {
    constructor() {
        this.name = 'France24';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://www.france24.com/en/rss');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: 'France24',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('France24 fetch error:', error);
        }
        return items;
    }
}

// ABC Australia Source
class ABCAustraliaSource {
    constructor() {
        this.name = 'ABC Australia';
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://www.abc.net.au/news/feed/51120/rss.xml');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: 'ABC Australia',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('ABC Australia fetch error:', error);
        }
        return items;
    }
}

// Local Newspaper Source - Aggregates various small-town newspapers
class LocalNewspaperSource {
    constructor() {
        this.name = 'Local News';
        // Collection of small-town newspaper RSS feeds from around the English-speaking world
        this.newspapers = [
            // US Small Towns
            { name: 'Burlington Free Press (VT)', url: 'https://www.burlingtonfreepress.com/arc/outboundfeeds/rss/' },
            { name: 'Concord Monitor (NH)', url: 'https://www.concordmonitor.com/arc/outboundfeeds/rss/' },
            { name: 'The Berkshire Eagle (MA)', url: 'https://www.berkshireeagle.com/arc/outboundfeeds/rss/' },
            { name: 'Santa Fe New Mexican', url: 'https://www.santafenewmexican.com/arc/outboundfeeds/rss/' },
            { name: 'Bozeman Daily Chronicle (MT)', url: 'https://www.bozemandailychronicle.com/arc/outboundfeeds/rss/' },

            // UK Local
            { name: 'Yorkshire Post', url: 'https://www.yorkshirepost.co.uk/news/rss' },
            { name: 'The Scotsman', url: 'https://www.scotsman.com/news/rss' },
            { name: 'Belfast Telegraph', url: 'https://www.belfasttelegraph.co.uk/news/rss/' },
            { name: 'Western Morning News', url: 'https://www.plymouthherald.co.uk/news/rss' },

            // Australia Regional
            { name: 'Newcastle Herald', url: 'https://www.newcastleherald.com.au/rss.xml' },
            { name: 'The Courier (Ballarat)', url: 'https://www.thecourier.com.au/rss.xml' },

            // Canada Local
            { name: 'Victoria Times Colonist', url: 'https://www.timescolonist.com/arc/outboundfeeds/rss/' },
            { name: 'Winnipeg Free Press', url: 'https://www.winnipegfreepress.com/rss/' },

            // New Zealand
            { name: 'Otago Daily Times', url: 'https://www.odt.co.nz/rss.xml' },

            // Ireland
            { name: 'Limerick Leader', url: 'https://www.limerickleader.ie/news/rss' }
        ];
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            // Pick a random newspaper
            const newspaper = this.newspapers[Math.floor(Math.random() * this.newspapers.length)];
            const response = await fetch(newspaper.url);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');

            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(5, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;

                if (title) {
                    items.push({
                        source: newspaper.name,
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('Local News fetch error:', error);
        }
        return items;
    }
}

// Crypto Source
class CryptoSource {
    constructor() {
        this.name = 'Crypto';
        this.coins = ['bitcoin', 'ethereum', 'cardano', 'solana', 'polkadot'];
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const coinList = this.coins.join(',');
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinList}&vs_currencies=usd&include_24hr_change=true`);
            const data = await response.json();

            const coin = this.coins[Math.floor(Math.random() * this.coins.length)];
            const coinData = data[coin];

            if (coinData) {
                const change = coinData.usd_24h_change?.toFixed(2);
                const changeSymbol = change > 0 ? '+' : '';
                items.push({
                    source: 'Crypto',
                    content: `${coin.charAt(0).toUpperCase() + coin.slice(1)}: $${coinData.usd} (${changeSymbol}${change}% 24h)`,
                    timestamp: Date.now(),
                    url: `https://www.coingecko.com/en/coins/${coin}`
                });
            }
        } catch (error) {
            console.error('Crypto fetch error:', error);
        }
        return items;
    }
}

// Weather Source
class WeatherSource {
    constructor() {
        this.name = 'Weather';
        this.cities = [
            { name: 'London', lat: 51.5074, lon: -0.1278 },
            { name: 'New York', lat: 40.7128, lon: -74.0060 },
            { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
            { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
            { name: 'Mumbai', lat: 19.0760, lon: 72.8777 }
        ];
    }

    async initialize() {}

    async fetch() {
        const items = [];
        try {
            const city = this.cities[Math.floor(Math.random() * this.cities.length)];
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`);
            const data = await response.json();

            if (data.current_weather) {
                const temp = data.current_weather.temperature;
                const windSpeed = data.current_weather.windspeed;
                items.push({
                    source: 'Weather',
                    content: `${city.name}: ${temp}°C, Wind: ${windSpeed} km/h`,
                    timestamp: Date.now(),
                    url: '#'
                });
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
        }
        return items;
    }
}

// CNN Source
class CNNSource {
    constructor() {
        this.name = 'CNN';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('http://rss.cnn.com/rss/cnn_topstories.rss');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');
            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;
                if (title) {
                    items.push({ source: 'CNN', content: title, timestamp: Date.now(), url: link || '#' });
                }
            }
        } catch (error) { console.error('CNN fetch error:', error); }
        return items;
    }
}

// Lobsters (Tech News Community)
class LobstersSource {
    constructor() {
        this.name = 'Lobsters';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://lobste.rs/hottest.json');
            const stories = await response.json();
            if (stories && stories.length > 0) {
                const story = stories[Math.floor(Math.random() * Math.min(10, stories.length))];
                items.push({
                    source: 'Lobsters',
                    content: story.title,
                    timestamp: Date.now(),
                    url: story.url || story.short_id_url
                });
            }
        } catch (error) {
            console.error('Lobsters fetch error:', error);
        }
        return items;
    }
}

// Slashdot
class SlashdotSource {
    constructor() {
        this.name = 'Slashdot';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://rss.slashdot.org/Slashdot/slashdotMain');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');
            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;
                if (title) {
                    items.push({
                        source: 'Slashdot',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('Slashdot fetch error:', error);
        }
        return items;
    }
}

// ArXiv (Scientific Papers)
class ArxivSource {
    constructor() {
        this.name = 'arXiv';
        this.categories = ['cs.AI', 'cs.LG', 'physics', 'math', 'q-bio'];
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const category = this.categories[Math.floor(Math.random() * this.categories.length)];
            const response = await fetch(`https://export.arxiv.org/api/query?search_query=cat:${category}&sortBy=lastUpdatedDate&max_results=10`);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const entries = xml.querySelectorAll('entry');
            if (entries.length > 0) {
                const entry = entries[Math.floor(Math.random() * entries.length)];
                const title = entry.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim();
                const link = entry.querySelector('id')?.textContent;
                if (title) {
                    items.push({
                        source: 'arXiv',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('arXiv fetch error:', error);
        }
        return items;
    }
}

// PubMed (Medical Research)
class PubMedSource {
    constructor() {
        this.name = 'PubMed';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://pubmed.ncbi.nlm.nih.gov/rss/search/1cVoF0F7w9FLZz1lVwJZWSDN_Lf8rDbVW71jq6EUNe2hTBY1Or/?limit=15&utm_campaign=pubmed-2&fc=20210630023751');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const items_xml = xml.querySelectorAll('item');
            if (items_xml.length > 0) {
                const item = items_xml[Math.floor(Math.random() * Math.min(5, items_xml.length))];
                const title = item.querySelector('title')?.textContent;
                const link = item.querySelector('link')?.textContent;
                if (title) {
                    items.push({
                        source: 'PubMed',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('PubMed fetch error:', error);
        }
        return items;
    }
}

// CoinDesk (Crypto News)
class CoinDeskSource {
    constructor() {
        this.name = 'CoinDesk';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://www.coindesk.com/arc/outboundfeeds/rss/');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');
            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;
                if (title) {
                    items.push({
                        source: 'CoinDesk',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('CoinDesk fetch error:', error);
        }
        return items;
    }
}

// CryptoCompare (Crypto Prices & News)
class CryptoCompareSource {
    constructor() {
        this.name = 'CryptoCompare';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
            const data = await response.json();
            if (data.Data && data.Data.length > 0) {
                const article = data.Data[Math.floor(Math.random() * Math.min(10, data.Data.length))];
                items.push({
                    source: 'CryptoCompare',
                    content: article.title,
                    timestamp: Date.now(),
                    url: article.url || '#'
                });
            }
        } catch (error) {
            console.error('CryptoCompare fetch error:', error);
        }
        return items;
    }
}

// Earthquake Data (USGS)
class EarthquakeSource {
    constructor() {
        this.name = 'USGS Earthquakes';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const quake = data.features[0];
                const mag = quake.properties.mag;
                const place = quake.properties.place;
                items.push({
                    source: 'USGS',
                    content: `Magnitude ${mag} earthquake ${place}`,
                    timestamp: Date.now(),
                    url: quake.properties.url || '#'
                });
            }
        } catch (error) {
            console.error('Earthquake fetch error:', error);
        }
        return items;
    }
}

// NASA (Astronomy Picture of the Day)
class NASASource {
    constructor() {
        this.name = 'NASA';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://www.nasa.gov/rss/dyn/breaking_news.rss');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');
            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(5, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;
                if (title) {
                    items.push({
                        source: 'NASA',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('NASA fetch error:', error);
        }
        return items;
    }
}

// Space News
class SpaceNewsSource {
    constructor() {
        this.name = 'SpaceNews';
    }
    async initialize() {}
    async fetch() {
        const items = [];
        try {
            const response = await fetch('https://spacenews.com/feed/');
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const itemElements = xml.querySelectorAll('item');
            if (itemElements.length > 0) {
                const randomItem = itemElements[Math.floor(Math.random() * Math.min(10, itemElements.length))];
                const title = randomItem.querySelector('title')?.textContent;
                const link = randomItem.querySelector('link')?.textContent;
                if (title) {
                    items.push({
                        source: 'SpaceNews',
                        content: title,
                        timestamp: Date.now(),
                        url: link || '#'
                    });
                }
            }
        } catch (error) {
            console.error('SpaceNews fetch error:', error);
        }
        return items;
    }
}
