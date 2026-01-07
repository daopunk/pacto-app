// Mock data for development - DELETE THIS FILE when connecting to Nostr relays

export const mockCommunities = [
  {
    id: 'community-1',
    name: 'Community One',
    image: '',
    channels: [
      { id: 'channel-1', name: 'general', type: 'text' },
      { id: 'channel-2', name: 'random', type: 'text' },
      { id: 'channel-3', name: 'announcements', type: 'text' },
    ]
  },
  {
    id: 'community-2',
    name: 'Community Two',
    image: '',
    channels: [
      { id: 'channel-4', name: 'welcome', type: 'text' },
      { id: 'channel-5', name: 'dev-chat', type: 'text' },
    ]
  }
];

// Messages organized by channel ID
export const mockChannelMessages: Record<string, any[]> = {
  'channel-1': [
    {
      id: '1',
      authorName: 'Alice',
      content: 'Hey everyone! Welcome to #general.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      avatar: ''
    },
    {
      id: '2',
      authorName: 'Bob',
      content: 'Thanks! Excited to be here.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      avatar: ''
    }
  ],
  'channel-2': [
    {
      id: '3',
      authorName: 'Charlie',
      content: 'Random thoughts incoming!',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      avatar: ''
    },
    {
      id: '4',
      authorName: 'Dave',
      content: 'This channel is pure chaos 😂',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      avatar: ''
    }
  ],
  'channel-3': [
    {
      id: '5',
      authorName: 'Admin',
      content: '📢 Welcome to announcements!',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      avatar: ''
    }
  ],
  'channel-4': [
    {
      id: '6',
      authorName: 'Eve',
      content: 'Welcome to Community Two!',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      avatar: ''
    }
  ],
  'channel-5': [
    {
      id: '7',
      authorName: 'Frank',
      content: 'Anyone working on the new feature?',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      avatar: ''
    },
    {
      id: '8',
      authorName: 'Grace',
      content: 'Yeah, making good progress!',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      avatar: ''
    }
  ]
};

