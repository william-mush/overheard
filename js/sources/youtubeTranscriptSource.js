// YouTube Transcript Source - Fetches transcripts from YouTube videos
// Uses YouTube's timedtext API for captions

export class YouTubeTranscriptSource {
    constructor(apiKey = null) {
        this.name = 'YouTube Transcripts';
        this.apiKey = apiKey || process.env.YOUTUBE_API_KEY;
        this.baseSearchUrl = 'https://www.googleapis.com/youtube/v3';
        this.timedTextBaseUrl = 'https://www.youtube.com/api/timedtext';
    }

    async initialize() {
        if (!this.apiKey) {
            console.warn('YouTube: No API key set. Set YOUTUBE_API_KEY environment variable.');
        }
    }

    // Search for videos by speaker name
    async searchVideosBySpeaker(speakerName, options = {}) {
        if (!this.apiKey) {
            throw new Error('YouTube API key required for search');
        }

        const { maxResults = 10, publishedAfter, publishedBefore, order = 'date' } = options;

        const params = new URLSearchParams({
            key: this.apiKey,
            part: 'snippet',
            type: 'video',
            videoCaption: 'closedCaption', // Only videos with captions
            q: speakerName,
            maxResults: maxResults.toString(),
            order
        });

        if (publishedAfter) {
            params.set('publishedAfter', new Date(publishedAfter).toISOString());
        }
        if (publishedBefore) {
            params.set('publishedBefore', new Date(publishedBefore).toISOString());
        }

        try {
            const response = await fetch(`${this.baseSearchUrl}/search?${params}`);

            if (!response.ok) {
                throw new Error(`YouTube search error: ${response.status}`);
            }

            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('YouTube search error:', error);
            throw error;
        }
    }

    // Get video details
    async getVideoDetails(videoId) {
        if (!this.apiKey) {
            throw new Error('YouTube API key required');
        }

        const params = new URLSearchParams({
            key: this.apiKey,
            part: 'snippet,contentDetails',
            id: videoId
        });

        try {
            const response = await fetch(`${this.baseSearchUrl}/videos?${params}`);

            if (!response.ok) {
                throw new Error(`YouTube video details error: ${response.status}`);
            }

            const data = await response.json();
            return data.items?.[0] || null;
        } catch (error) {
            console.error('YouTube video details error:', error);
            throw error;
        }
    }

    // Get caption track info
    async getCaptionTracks(videoId) {
        if (!this.apiKey) {
            throw new Error('YouTube API key required');
        }

        const params = new URLSearchParams({
            key: this.apiKey,
            part: 'snippet',
            videoId
        });

        try {
            const response = await fetch(`${this.baseSearchUrl}/captions?${params}`);

            if (!response.ok) {
                throw new Error(`YouTube captions error: ${response.status}`);
            }

            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('YouTube captions list error:', error);
            throw error;
        }
    }

    // Extract video ID from various YouTube URL formats
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    // Fetch transcript using the timedtext API (for videos with available captions)
    async fetchTranscript(videoId, lang = 'en') {
        try {
            // First, try to get the video page to extract caption track URLs
            const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const response = await fetch(videoPageUrl);
            const html = await response.text();

            // Extract captions player response
            const captionsMatch = html.match(/"captions":\s*(\{.*?\}),"videoDetails"/s);

            if (!captionsMatch) {
                // Try alternative pattern
                const altMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
                if (!altMatch) {
                    return { success: false, error: 'No captions available', transcript: null };
                }
            }

            // Try to extract caption track URL
            const trackUrlMatch = html.match(/"baseUrl":\s*"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);

            if (!trackUrlMatch) {
                return { success: false, error: 'Could not find caption track URL', transcript: null };
            }

            // Decode the URL
            let captionUrl = trackUrlMatch[1].replace(/\\u0026/g, '&');

            // Fetch the captions
            const captionResponse = await fetch(captionUrl);

            if (!captionResponse.ok) {
                return { success: false, error: 'Failed to fetch captions', transcript: null };
            }

            const captionText = await captionResponse.text();

            // Parse the XML/JSON response
            const transcript = this.parseTranscriptResponse(captionText);

            return {
                success: true,
                videoId,
                transcript
            };
        } catch (error) {
            console.error('Transcript fetch error:', error);
            return { success: false, error: error.message, transcript: null };
        }
    }

    // Parse transcript response (handles both XML and JSON formats)
    parseTranscriptResponse(text) {
        const segments = [];

        // Try XML format first (common for timedtext API)
        if (text.trim().startsWith('<?xml') || text.trim().startsWith('<transcript')) {
            const textMatches = text.matchAll(/<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g);

            for (const match of textMatches) {
                const start = parseFloat(match[1]);
                const duration = parseFloat(match[2]);
                const content = this.decodeHtmlEntities(match[3]);

                segments.push({
                    start,
                    duration,
                    end: start + duration,
                    text: content
                });
            }
        } else {
            // Try JSON3 format
            try {
                const json = JSON.parse(text);
                if (json.events) {
                    for (const event of json.events) {
                        if (event.segs) {
                            const text = event.segs.map(s => s.utf8).join('');
                            segments.push({
                                start: event.tStartMs / 1000,
                                duration: (event.dDurationMs || 0) / 1000,
                                text
                            });
                        }
                    }
                }
            } catch (e) {
                // Not JSON, try plain text parsing
                const lines = text.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        segments.push({ text: line.trim(), start: null, duration: null });
                    }
                }
            }
        }

        return segments;
    }

    // Decode HTML entities
    decodeHtmlEntities(text) {
        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&#x27;': "'",
            '&#x2F;': '/',
            '&#32;': ' ',
            '&nbsp;': ' '
        };

        let decoded = text;
        for (const [entity, char] of Object.entries(entities)) {
            decoded = decoded.replace(new RegExp(entity, 'g'), char);
        }

        // Handle numeric entities
        decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
        decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

        return decoded;
    }

    // Combine transcript segments into full text
    combineTranscriptSegments(segments) {
        if (!segments || segments.length === 0) {
            return '';
        }

        return segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    }

    // Format transcript with timestamps
    formatTranscriptWithTimestamps(segments) {
        if (!segments || segments.length === 0) {
            return '';
        }

        return segments.map(s => {
            if (s.start !== null) {
                const timestamp = this.formatTimestamp(s.start);
                return `[${timestamp}] ${s.text}`;
            }
            return s.text;
        }).join('\n');
    }

    // Format seconds to HH:MM:SS
    formatTimestamp(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Convert to standard transcript format
    toTranscriptFormat(video, transcript, speakerMap = {}) {
        const speakerId = this.findSpeakerId(video.speakerName, speakerMap);
        const segments = transcript?.transcript || [];

        return {
            id: `youtube-${video.videoId}-${Date.now()}`,
            speaker: video.speakerName || 'Unknown',
            speakerId: speakerId,
            role: null,
            date: video.publishedAt ? video.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            source: 'YouTube',
            sourceUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
            eventType: this.determineEventType(video.title || ''),
            title: video.title || null,
            fullText: this.combineTranscriptSegments(segments),
            extractedQuotes: [],
            metadata: {
                videoId: video.videoId,
                channelTitle: video.channelTitle || null,
                duration: video.duration || null,
                segments: segments
            }
        };
    }

    // Find speaker ID from speakers.json mapping
    findSpeakerId(speakerName, speakerMap) {
        if (!speakerName || !speakerMap) return null;

        const normalizedName = speakerName.toLowerCase().replace(/[^a-z\s]/g, '');

        for (const [id, speaker] of Object.entries(speakerMap)) {
            const mapName = speaker.name.toLowerCase().replace(/[^a-z\s]/g, '');
            if (mapName.includes(normalizedName) || normalizedName.includes(mapName)) {
                return id;
            }
        }

        return null;
    }

    // Determine event type from video title
    determineEventType(title) {
        const lowerTitle = title.toLowerCase();

        if (lowerTitle.includes('interview')) return 'interview';
        if (lowerTitle.includes('rally') || lowerTitle.includes('campaign')) return 'rally';
        if (lowerTitle.includes('speech') || lowerTitle.includes('address')) return 'speech';
        if (lowerTitle.includes('testimony') || lowerTitle.includes('hearing')) return 'testimony';
        if (lowerTitle.includes('briefing') || lowerTitle.includes('press')) return 'briefing';
        if (lowerTitle.includes('debate')) return 'debate';

        return 'speech';
    }

    // Fetch transcripts for a speaker
    async fetchTranscriptsForSpeaker(speakerName, options = {}) {
        const results = [];

        try {
            // Search for videos
            const videos = await this.searchVideosBySpeaker(speakerName, options);

            for (const video of videos) {
                const videoId = video.id?.videoId;
                if (!videoId) continue;

                // Fetch transcript
                const transcript = await this.fetchTranscript(videoId);

                if (transcript.success) {
                    results.push({
                        videoId,
                        title: video.snippet?.title,
                        channelTitle: video.snippet?.channelTitle,
                        publishedAt: video.snippet?.publishedAt,
                        speakerName,
                        transcript: transcript.transcript
                    });
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Error fetching transcripts for speaker:', error);
        }

        return results;
    }

    // Main fetch method for integration with dataSourceManager
    async fetch(options = {}) {
        const items = [];

        // This method would typically be called with specific speaker names
        // For general polling, it returns empty or uses predefined speakers

        return items;
    }
}

export default YouTubeTranscriptSource;
