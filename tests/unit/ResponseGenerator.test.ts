// Unit tests for Response Generator

import { ResponseGenerator } from '../../src/services/ResponseGenerator';
import { UserPreferences, TimeSlot, AvailabilityCheckResult } from '../../src/types';

describe('ResponseGenerator', () => {
  let generator: ResponseGenerator;
  let mockPreferences: UserPreferences;

  beforeEach(() => {
    generator = new ResponseGenerator();
    mockPreferences = {
      id: 'pref-1',
      userId: 'user-1',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      bufferMinutes: 15,
      defaultMeetingDuration: 30,
      automationEnabled: true,
      confidenceThreshold: 0.85,
      vipWhitelist: [],
      blacklist: [],
      notificationChannels: { email: true, push: false, sms: false },
      circuitBreakerConfig: { maxLowConfidence: 5, cooldownMinutes: 60 },
      learningEnabled: true,
      responseTone: 'professional',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('Tone Variations', () => {
    it('should generate professional tone response', async () => {
      const availability: AvailabilityCheckResult = {
        requested: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') }
        ],
        available: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') }
        ],
        conflicts: [],
        suggested: [],
        hasConflicts: false
      };

      const response = await generator.generateAvailabilityResponse(
        availability,
        mockPreferences,
        'Alice'
      );

      expect(response.text).toContain('Hi Alice');
      expect(response.text).toContain('Best');
      expect(response.summary).toBeDefined();
    });

    it('should generate formal tone response', async () => {
      mockPreferences.responseTone = 'formal';

      const availability: AvailabilityCheckResult = {
        requested: [],
        available: [],
        conflicts: [],
        suggested: [
          { start: new Date('2025-11-21T10:00:00Z'), end: new Date('2025-11-21T11:00:00Z') }
        ],
        hasConflicts: false
      };

      const response = await generator.generateAvailabilityResponse(
        availability,
        mockPreferences
      );

      expect(response.text).toContain('Dear');
      expect(response.text).toContain('Best regards');
    });

    it('should generate casual tone response', async () => {
      mockPreferences.responseTone = 'casual';

      const slot: TimeSlot = {
        start: new Date('2025-11-20T14:00:00Z'),
        end: new Date('2025-11-20T15:00:00Z')
      };

      const response = await generator.generateConfirmation(
        slot,
        mockPreferences,
        'Bob'
      );

      expect(response.text).toContain('Hey Bob');
      expect(response.text).toContain('Cheers');
    });
  });

  describe('Availability Scenarios', () => {
    it('should handle fully available scenario', async () => {
      const availability: AvailabilityCheckResult = {
        requested: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') },
          { start: new Date('2025-11-21T10:00:00Z'), end: new Date('2025-11-21T11:00:00Z') }
        ],
        available: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') },
          { start: new Date('2025-11-21T10:00:00Z'), end: new Date('2025-11-21T11:00:00Z') }
        ],
        conflicts: [],
        suggested: [],
        hasConflicts: false
      };

      const response = await generator.generateAvailabilityResponse(
        availability,
        mockPreferences
      );

      expect(response.text).toContain('available at all the times');
      expect(response.summary).toContain('2 available slot');
    });

    it('should handle no availability scenario with alternatives', async () => {
      const availability: AvailabilityCheckResult = {
        requested: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') }
        ],
        available: [],
        conflicts: [],
        suggested: [
          { start: new Date('2025-11-21T10:00:00Z'), end: new Date('2025-11-21T11:00:00Z') },
          { start: new Date('2025-11-22T14:00:00Z'), end: new Date('2025-11-22T15:00:00Z') }
        ],
        hasConflicts: true
      };

      const response = await generator.generateAvailabilityResponse(
        availability,
        mockPreferences
      );

      expect(response.text).toContain("don't have any availability");
      expect(response.text).toContain('alternative times');
      expect(response.summary).toContain('2 alternatives');
    });
  });

  describe('Confirmation Responses', () => {
    it('should generate confirmation with time details', async () => {
      const slot: TimeSlot = {
        start: new Date('2025-11-20T14:00:00Z'),
        end: new Date('2025-11-20T15:00:00Z')
      };

      const response = await generator.generateConfirmation(
        slot,
        mockPreferences,
        'Charlie'
      );

      expect(response.text).toContain('confirmed');
      expect(response.text).toContain('calendar');
      expect(response.summary).toContain('Confirmed meeting');
    });
  });

  describe('HTML Generation', () => {
    it('should convert text to HTML with paragraphs', async () => {
      const availability: AvailabilityCheckResult = {
        requested: [],
        available: [
          { start: new Date('2025-11-20T14:00:00Z'), end: new Date('2025-11-20T15:00:00Z') }
        ],
        conflicts: [],
        suggested: [],
        hasConflicts: false
      };

      const response = await generator.generateAvailabilityResponse(
        availability,
        mockPreferences
      );

      expect(response.html).toContain('<p>');
      expect(response.html).toContain('</p>');
    });
  });
});
