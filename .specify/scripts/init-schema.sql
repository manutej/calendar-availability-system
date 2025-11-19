-- Calendar Availability System - Database Schema
-- Version: 2.0.0 (Autonomous Operation)
-- Created: 2025-11-19

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- User preferences table (includes automation settings)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '17:00',
    buffer_minutes INTEGER DEFAULT 15,
    default_meeting_duration INTEGER DEFAULT 30,

    -- Automation settings (Article X)
    automation_enabled BOOLEAN DEFAULT TRUE,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.85,
    vip_whitelist TEXT[] DEFAULT '{}',
    blacklist TEXT[] DEFAULT '{}',
    notification_channels JSONB DEFAULT '{"email": true, "push": false, "sms": false}',
    circuit_breaker_config JSONB DEFAULT '{"max_low_confidence": 5, "cooldown_minutes": 60}',
    learning_enabled BOOLEAN DEFAULT TRUE,
    response_tone VARCHAR(50) DEFAULT 'professional',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Calendars table
CREATE TABLE IF NOT EXISTS calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'google', 'external'
    name VARCHAR(255) NOT NULL,
    external_id VARCHAR(255),
    connection_details JSONB,
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'error', 'paused'
    last_sync_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
    recurrence_rule TEXT,
    attendees JSONB DEFAULT '[]',
    location VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(calendar_id, external_id)
);

-- Availability requests table
CREATE TABLE IF NOT EXISTS availability_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_email VARCHAR(255) NOT NULL,
    requester_name VARCHAR(255),
    email_thread_id VARCHAR(500) NOT NULL,
    email_message_id VARCHAR(500) NOT NULL,
    subject VARCHAR(500),
    raw_request_text TEXT NOT NULL,
    proposed_times JSONB DEFAULT '[]',
    extracted_participants JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'responded', 'scheduled', 'declined'
    response_sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Confidence assessments table (Article X: Autonomous Operation)
CREATE TABLE IF NOT EXISTS confidence_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES availability_requests(id) ON DELETE CASCADE,
    overall_confidence DECIMAL(3,2) NOT NULL CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
    intent_confidence DECIMAL(3,2) CHECK (intent_confidence >= 0 AND intent_confidence <= 1),
    time_parsing_confidence DECIMAL(3,2) CHECK (time_parsing_confidence >= 0 AND time_parsing_confidence <= 1),
    sender_trust_score DECIMAL(3,2) CHECK (sender_trust_score >= 0 AND sender_trust_score <= 1),
    conversation_clarity DECIMAL(3,2) CHECK (conversation_clarity >= 0 AND conversation_clarity <= 1),
    factors JSONB, -- Detailed confidence calculation breakdown
    recommendation VARCHAR(50) NOT NULL, -- 'auto_respond', 'request_approval', 'decline'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Conversation states table (multi-turn tracking)
CREATE TABLE IF NOT EXISTS conversation_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(500) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(50) NOT NULL DEFAULT 'initial', -- 'initial', 'availability_sent', 'confirmed', 'scheduled', 'closed'
    turn_count INTEGER DEFAULT 1,
    current_request_id UUID REFERENCES availability_requests(id),
    previous_request_ids UUID[] DEFAULT '{}',
    context JSONB DEFAULT '{}', -- Full conversation context
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Automation audit log table (100% transparency)
CREATE TABLE IF NOT EXISTS automation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES availability_requests(id),
    conversation_id UUID REFERENCES conversation_states(id),
    action VARCHAR(50) NOT NULL, -- 'sent_email', 'declined_request', 'requested_clarification', 'escalated'
    confidence_score DECIMAL(3,2) NOT NULL,
    decision_rationale TEXT NOT NULL,
    email_sent_id VARCHAR(500),
    calendar_events_considered JSONB DEFAULT '[]',
    conversation_context JSONB DEFAULT '{}',
    user_notified BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP,
    user_override VARCHAR(50), -- 'approved', 'retracted', 'marked_incorrect', null
    user_override_at TIMESTAMP,
    user_override_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Circuit breaker state table (safety mechanism)
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(20) NOT NULL DEFAULT 'closed', -- 'closed', 'open', 'half_open'
    consecutive_low_confidence INTEGER DEFAULT 0,
    last_low_confidence_at TIMESTAMP,
    opened_at TIMESTAMP,
    closes_at TIMESTAMP,
    manual_override BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Email responses table
CREATE TABLE IF NOT EXISTS email_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES availability_requests(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    response_html TEXT,
    sent_at TIMESTAMP,
    email_message_id VARCHAR(500),
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'failed', 'retracted'
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendars_user ON calendars(user_id);
CREATE INDEX idx_calendars_sync ON calendars(sync_status);
CREATE INDEX idx_events_calendar ON calendar_events(calendar_id);
CREATE INDEX idx_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_events_status ON calendar_events(status);
CREATE INDEX idx_requests_user ON availability_requests(user_id);
CREATE INDEX idx_requests_thread ON availability_requests(email_thread_id);
CREATE INDEX idx_requests_status ON availability_requests(status);
CREATE INDEX idx_confidence_request ON confidence_assessments(request_id);
CREATE INDEX idx_confidence_score ON confidence_assessments(overall_confidence DESC);
CREATE INDEX idx_conversation_thread ON conversation_states(thread_id);
CREATE INDEX idx_conversation_user ON conversation_states(user_id);
CREATE INDEX idx_conversation_state ON conversation_states(state);
CREATE INDEX idx_audit_user ON automation_audit_log(user_id);
CREATE INDEX idx_audit_created ON automation_audit_log(created_at DESC);
CREATE INDEX idx_audit_action ON automation_audit_log(action);
CREATE INDEX idx_audit_confidence ON automation_audit_log(confidence_score);
CREATE INDEX idx_circuit_breaker_user ON circuit_breaker_state(user_id);
CREATE INDEX idx_circuit_breaker_state ON circuit_breaker_state(state);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE ON calendars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON availability_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversation_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_circuit_breaker_updated_at BEFORE UPDATE ON circuit_breaker_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON email_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
