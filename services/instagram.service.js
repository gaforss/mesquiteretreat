import axios from 'axios';

class InstagramService {
  constructor() {
    this.baseURL = 'https://graph.instagram.com/v12.0';
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.appId = process.env.INSTAGRAM_APP_ID;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET;
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://mesquiteretreat.com/auth/instagram/callback';
  }

  // Get authorization URL for Instagram Basic Display API
  getAuthUrl() {
    const scopes = ['user_profile', 'user_media'];
    const state = this.generateState();
    
    return `https://api.instagram.com/oauth/authorize?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes.join(',')}&response_type=code&state=${state}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id: this.appId,
        client_secret: this.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code: code
      });

      return response.data;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  // Get user's media (photos/videos)
  async getUserMedia(userId = 'me', limit = 25, after = null) {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      let url = `${this.baseURL}/${userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,like_count,comments_count&access_token=${this.accessToken}&limit=${limit}`;
      
      if (after) {
        url += `&after=${after}`;
      }

      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching user media:', error);
      throw error;
    }
  }

  // Get media by hashtag (requires Instagram Graph API - Business/Creator accounts)
  async getMediaByHashtag(hashtag, limit = 25) {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      // First, get the hashtag ID
      const hashtagResponse = await axios.get(`${this.baseURL}/ig_hashtag_search?user_token=${this.accessToken}&q=${hashtag}`);
      
      if (!hashtagResponse.data.data || hashtagResponse.data.data.length === 0) {
        throw new Error(`Hashtag #${hashtag} not found`);
      }

      const hashtagId = hashtagResponse.data.data[0].id;
      
      // Get recent media for the hashtag
      const mediaResponse = await axios.get(`${this.baseURL}/${hashtagId}/recent_media?user_token=${this.accessToken}&fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,like_count,comments_count&limit=${limit}`);
      
      return mediaResponse.data;
    } catch (error) {
      console.error('Error fetching media by hashtag:', error);
      throw error;
    }
  }

  // Get media by hashtag using Basic Display API (limited functionality)
  async getMediaByHashtagBasic(hashtag, limit = 25) {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      // Basic Display API doesn't support hashtag search directly
      // We'll fetch user's media and filter by hashtags in captions
      const userMedia = await this.getUserMedia('me', 100);
      
      const filteredMedia = userMedia.data.filter(media => {
        if (!media.caption) return false;
        const hashtags = this.extractHashtags(media.caption);
        return hashtags.includes(hashtag.toLowerCase());
      });

      return {
        data: filteredMedia.slice(0, limit),
        paging: userMedia.paging
      };
    } catch (error) {
      console.error('Error fetching media by hashtag (basic):', error);
      throw error;
    }
  }

  // Extract hashtags from caption
  extractHashtags(caption) {
    if (!caption) return [];
    const hashtagRegex = /#(\w+)/g;
    const matches = caption.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
  }

  // Get media details by ID
  async getMediaById(mediaId) {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      const response = await axios.get(`${this.baseURL}/${mediaId}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,like_count,comments_count&access_token=${this.accessToken}`);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching media by ID:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      const response = await axios.get(`${this.baseURL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.accessToken}`);
      
      return response.data;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId = 'me') {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      const response = await axios.get(`${this.baseURL}/${userId}?fields=id,username,account_type&access_token=${this.accessToken}`);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Generate random state for OAuth
  generateState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Check if Instagram API is configured
  isConfigured() {
    return !!(this.accessToken && this.appId && this.appSecret);
  }

  // Get configuration status
  getConfigStatus() {
    return {
      hasAccessToken: !!this.accessToken,
      hasAppId: !!this.appId,
      hasAppSecret: !!this.appSecret,
      isConfigured: this.isConfigured(),
      apiVersion: 'v12.0',
      baseURL: this.baseURL
    };
  }

  // Validate access token
  async validateAccessToken() {
    try {
      if (!this.accessToken) {
        return { valid: false, error: 'No access token configured' };
      }

      const response = await axios.get(`${this.baseURL}/me?fields=id,username&access_token=${this.accessToken}`);
      return { valid: true, user: response.data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Get token info (expiration, permissions, etc.)
  async getTokenInfo() {
    try {
      if (!this.accessToken) {
        return { error: 'No access token configured' };
      }

      const response = await axios.get(`${this.baseURL}/debug_token?input_token=${this.accessToken}&access_token=${this.appId}|${this.appSecret}`);
      return response.data;
    } catch (error) {
      console.error('Error getting token info:', error);
      return { error: error.message };
    }
  }

  // Search for users (requires Business/Creator account)
  async searchUsers(query, limit = 10) {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      const response = await axios.get(`${this.baseURL}/ig_hashtag_search?user_token=${this.accessToken}&q=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Get comments for a media item
  async getMediaComments(mediaId, limit = 25) {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      const response = await axios.get(`${this.baseURL}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${this.accessToken}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching media comments:', error);
      throw error;
    }
  }

  // Get insights for media (requires Business/Creator account)
  async getMediaInsights(mediaId) {
    try {
      if (!this.accessToken) {
        throw new Error('Instagram access token not configured');
      }

      const response = await axios.get(`${this.baseURL}/${mediaId}/insights?metric=impressions,reach,engagement&access_token=${this.accessToken}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching media insights:', error);
      throw error;
    }
  }
}

export default new InstagramService(); 