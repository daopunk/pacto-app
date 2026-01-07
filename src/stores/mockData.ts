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

export const mockMessages = [
  {
    id: '1',
    authorName: 'Alice',
    content: 'Hey everyone! Welcome to the channel.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    avatar: ''
  },
  {
    id: '2',
    authorName: 'Bob',
    content: 'Thanks! Excited to be here.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    avatar: ''
  },
  {
    id: '3',
    authorName: 'Charlie',
    content: 'This looks great! How do I get started?',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    avatar: ''
  }
];

