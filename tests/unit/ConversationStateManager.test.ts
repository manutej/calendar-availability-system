// Unit tests for Conversation State Machine

import { ConversationStateManager } from '../../src/services/ConversationStateManager';

// Mock database
jest.mock('../../src/utils/database', () => ({
  query: jest.fn()
}));

import { query } from '../../src/utils/database';
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('ConversationStateManager', () => {
  let manager: ConversationStateManager;

  beforeEach(() => {
    manager = new ConversationStateManager();
    jest.clearAllMocks();
  });

  describe('State Transitions', () => {
    it('should allow valid state transition: initial -> availability_sent', async () => {
      // Mock existing conversation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          thread_id: 'thread-123',
          user_id: 'user-1',
          state: 'initial',
          turn_count: 1,
          context: '{}',
          last_activity: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      } as any);

      // Mock update
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          thread_id: 'thread-123',
          user_id: 'user-1',
          state: 'availability_sent',
          turn_count: 2,
          context: '{}',
          last_activity: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      } as any);

      const updated = await manager.transition('thread-123', 'availability_sent');

      expect(updated.state).toBe('availability_sent');
      expect(updated.turnCount).toBe(2);
    });

    it('should reject invalid state transition: scheduled -> initial', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          thread_id: 'thread-123',
          user_id: 'user-1',
          state: 'scheduled',
          turn_count: 3,
          context: '{}',
          last_activity: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      } as any);

      await expect(manager.transition('thread-123', 'initial')).rejects.toThrow(
        /Invalid state transition/
      );
    });

    it('should allow closed state from any state', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          thread_id: 'thread-123',
          user_id: 'user-1',
          state: 'confirmed',
          turn_count: 2,
          context: '{}',
          last_activity: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          thread_id: 'thread-123',
          user_id: 'user-1',
          state: 'closed',
          turn_count: 3,
          context: '{}',
          last_activity: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      } as any);

      const updated = await manager.transition('thread-123', 'closed');
      expect(updated.state).toBe('closed');
    });
  });

  describe('Context Management', () => {
    it('should merge context updates without overwriting existing data', async () => {
      const existingContext = {
        lastProposedTimes: [{ start: new Date(), end: new Date() }],
        confirmedSlot: null
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'conv-1',
          thread_id: 'thread-123',
          user_id: 'user-1',
          state: 'availability_sent',
          turn_count: 2,
          context: JSON.stringify(existingContext),
          last_activity: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      } as any);

      await manager.updateContext('thread-123', { confirmedSlot: 'Tuesday 2pm' });

      // Verify the UPDATE query was called with merged context
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversation_states'),
        expect.arrayContaining([
          expect.stringContaining('lastProposedTimes'),
          'thread-123'
        ])
      );
    });
  });
});
