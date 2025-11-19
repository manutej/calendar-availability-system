# Calendar Availability Management System - API Specification

**Version**: 1.0.0
**Created**: 2025-11-18
**OpenAPI**: 3.0.3

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: Calendar Availability Management System API
  description: |
    RESTful API for calendar integration, availability management, and automated scheduling.
    Supports Google Calendar via MCP, email automation, and external calendar scraping.
  version: 1.0.0
  contact:
    name: CAMS Support
    email: support@cams.example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.cams.example.com/v1
    description: Production server
  - url: https://staging-api.cams.example.com/v1
    description: Staging server
  - url: http://localhost:3000/v1
    description: Local development

tags:
  - name: Authentication
    description: User authentication and authorization
  - name: Calendars
    description: Calendar connection and management
  - name: Events
    description: Calendar event operations
  - name: Availability
    description: Availability checking and management
  - name: Email
    description: Email integration and automation
  - name: Scraping
    description: External calendar scraping
  - name: Templates
    description: Email template management
  - name: Analytics
    description: Usage analytics and reporting

paths:
  # Authentication Endpoints
  /auth/login:
    post:
      tags: [Authentication]
      summary: User login
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                  example: user@example.com
                password:
                  type: string
                  format: password
                  minLength: 8
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        401:
          $ref: '#/components/responses/Unauthorized'
        429:
          $ref: '#/components/responses/TooManyRequests'

  /auth/refresh:
    post:
      tags: [Authentication]
      summary: Refresh access token
      operationId: refreshToken
      security:
        - refreshToken: []
      responses:
        200:
          description: Token refreshed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        401:
          $ref: '#/components/responses/Unauthorized'

  /auth/logout:
    post:
      tags: [Authentication]
      summary: User logout
      operationId: logout
      security:
        - bearerAuth: []
      responses:
        204:
          description: Logout successful
        401:
          $ref: '#/components/responses/Unauthorized'

  /auth/oauth/google:
    get:
      tags: [Authentication]
      summary: Initiate Google OAuth flow
      operationId: googleOAuthInit
      parameters:
        - name: redirect_uri
          in: query
          required: true
          schema:
            type: string
            format: uri
        - name: scope
          in: query
          required: false
          schema:
            type: string
            default: calendar.readonly gmail.readonly
      responses:
        302:
          description: Redirect to Google OAuth
          headers:
            Location:
              schema:
                type: string
                format: uri

  /auth/oauth/google/callback:
    get:
      tags: [Authentication]
      summary: Google OAuth callback
      operationId: googleOAuthCallback
      parameters:
        - name: code
          in: query
          required: true
          schema:
            type: string
        - name: state
          in: query
          required: true
          schema:
            type: string
      responses:
        200:
          description: OAuth successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OAuthResponse'
        400:
          $ref: '#/components/responses/BadRequest'

  # Calendar Endpoints
  /calendars:
    get:
      tags: [Calendars]
      summary: List user calendars
      operationId: listCalendars
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: type
          in: query
          schema:
            type: string
            enum: [google, external, all]
            default: all
      responses:
        200:
          description: Calendar list
          content:
            application/json:
              schema:
                type: object
                properties:
                  calendars:
                    type: array
                    items:
                      $ref: '#/components/schemas/Calendar'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        401:
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Calendars]
      summary: Connect a new calendar
      operationId: connectCalendar
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/GoogleCalendarConnection'
                - $ref: '#/components/schemas/ExternalCalendarConnection'
      responses:
        201:
          description: Calendar connected
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Calendar'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'

  /calendars/{calendarId}:
    get:
      tags: [Calendars]
      summary: Get calendar details
      operationId: getCalendar
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/CalendarIdParam'
      responses:
        200:
          description: Calendar details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Calendar'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

    patch:
      tags: [Calendars]
      summary: Update calendar settings
      operationId: updateCalendar
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/CalendarIdParam'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                color:
                  type: string
                  pattern: '^#[0-9A-Fa-f]{6}$'
                syncEnabled:
                  type: boolean
                isDefault:
                  type: boolean
      responses:
        200:
          description: Calendar updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Calendar'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

    delete:
      tags: [Calendars]
      summary: Disconnect calendar
      operationId: disconnectCalendar
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/CalendarIdParam'
      responses:
        204:
          description: Calendar disconnected
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

  /calendars/{calendarId}/sync:
    post:
      tags: [Calendars]
      summary: Trigger calendar sync
      operationId: syncCalendar
      security:
        - bearerAuth: []
      parameters:
        - $ref: '#/components/parameters/CalendarIdParam'
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                force:
                  type: boolean
                  default: false
                  description: Force full sync instead of incremental
      responses:
        202:
          description: Sync initiated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SyncStatus'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'
        429:
          $ref: '#/components/responses/TooManyRequests'

  # Event Endpoints
  /events:
    get:
      tags: [Events]
      summary: List calendar events
      operationId: listEvents
      security:
        - bearerAuth: []
      parameters:
        - name: calendarIds
          in: query
          required: false
          schema:
            type: array
            items:
              type: string
              format: uuid
          style: form
          explode: true
        - name: startDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: includeRecurring
          in: query
          schema:
            type: boolean
            default: true
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        200:
          description: Event list
          content:
            application/json:
              schema:
                type: object
                properties:
                  events:
                    type: array
                    items:
                      $ref: '#/components/schemas/Event'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'

  /events/{eventId}:
    get:
      tags: [Events]
      summary: Get event details
      operationId: getEvent
      security:
        - bearerAuth: []
      parameters:
        - name: eventId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Event details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Event'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

  # Availability Endpoints
  /availability:
    get:
      tags: [Availability]
      summary: Check availability
      operationId: checkAvailability
      security:
        - bearerAuth: []
      parameters:
        - name: startDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: duration
          in: query
          required: false
          schema:
            type: integer
            minimum: 15
            maximum: 480
            default: 60
            description: Meeting duration in minutes
        - name: calendarIds
          in: query
          required: false
          schema:
            type: array
            items:
              type: string
              format: uuid
        - name: timezone
          in: query
          required: false
          schema:
            type: string
            default: UTC
        - name: workingHoursOnly
          in: query
          schema:
            type: boolean
            default: true
      responses:
        200:
          description: Available time slots
          content:
            application/json:
              schema:
                type: object
                properties:
                  slots:
                    type: array
                    items:
                      $ref: '#/components/schemas/TimeSlot'
                  conflicts:
                    type: array
                    items:
                      $ref: '#/components/schemas/Conflict'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'

  /availability/suggest:
    post:
      tags: [Availability]
      summary: Get meeting time suggestions
      operationId: suggestMeetingTimes
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [participants, duration, dateRange]
              properties:
                participants:
                  type: array
                  items:
                    type: string
                    format: email
                  minItems: 2
                duration:
                  type: integer
                  minimum: 15
                  maximum: 480
                  description: Meeting duration in minutes
                dateRange:
                  type: object
                  required: [start, end]
                  properties:
                    start:
                      type: string
                      format: date-time
                    end:
                      type: string
                      format: date-time
                preferences:
                  type: object
                  properties:
                    preferredTimes:
                      type: array
                      items:
                        type: string
                        enum: [morning, afternoon, evening]
                    avoidDays:
                      type: array
                      items:
                        type: string
                        enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
                    bufferTime:
                      type: integer
                      minimum: 0
                      maximum: 60
                      default: 15
      responses:
        200:
          description: Meeting time suggestions
          content:
            application/json:
              schema:
                type: object
                properties:
                  suggestions:
                    type: array
                    items:
                      $ref: '#/components/schemas/MeetingSuggestion'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'

  # Email Endpoints
  /email/requests:
    get:
      tags: [Email]
      summary: List availability requests
      operationId: listAvailabilityRequests
      security:
        - bearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, responded, scheduled, all]
            default: all
        - name: since
          in: query
          schema:
            type: string
            format: date-time
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        200:
          description: Request list
          content:
            application/json:
              schema:
                type: object
                properties:
                  requests:
                    type: array
                    items:
                      $ref: '#/components/schemas/AvailabilityRequest'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        401:
          $ref: '#/components/responses/Unauthorized'

  /email/requests/{requestId}:
    get:
      tags: [Email]
      summary: Get availability request details
      operationId: getAvailabilityRequest
      security:
        - bearerAuth: []
      parameters:
        - name: requestId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Request details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AvailabilityRequest'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

  /email/requests/{requestId}/respond:
    post:
      tags: [Email]
      summary: Respond to availability request
      operationId: respondToRequest
      security:
        - bearerAuth: []
      parameters:
        - name: requestId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action]
              properties:
                action:
                  type: string
                  enum: [approve, suggest, decline]
                availableSlots:
                  type: array
                  items:
                    $ref: '#/components/schemas/TimeSlot'
                message:
                  type: string
                  maxLength: 1000
                templateId:
                  type: string
                  format: uuid
      responses:
        200:
          description: Response sent
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmailResponse'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

  /email/monitoring:
    get:
      tags: [Email]
      summary: Get email monitoring status
      operationId: getMonitoringStatus
      security:
        - bearerAuth: []
      responses:
        200:
          description: Monitoring status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MonitoringStatus'
        401:
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Email]
      summary: Enable/disable email monitoring
      operationId: toggleMonitoring
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [enabled]
              properties:
                enabled:
                  type: boolean
                filters:
                  type: object
                  properties:
                    labels:
                      type: array
                      items:
                        type: string
                    senders:
                      type: array
                      items:
                        type: string
                        format: email
      responses:
        200:
          description: Monitoring updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MonitoringStatus'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'

  # Template Endpoints
  /templates:
    get:
      tags: [Templates]
      summary: List email templates
      operationId: listTemplates
      security:
        - bearerAuth: []
      parameters:
        - name: type
          in: query
          schema:
            type: string
            enum: [availability, confirmation, decline, all]
            default: all
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        200:
          description: Template list
          content:
            application/json:
              schema:
                type: object
                properties:
                  templates:
                    type: array
                    items:
                      $ref: '#/components/schemas/EmailTemplate'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        401:
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Templates]
      summary: Create email template
      operationId: createTemplate
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EmailTemplateInput'
      responses:
        201:
          description: Template created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmailTemplate'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'

  /templates/{templateId}:
    get:
      tags: [Templates]
      summary: Get template details
      operationId: getTemplate
      security:
        - bearerAuth: []
      parameters:
        - name: templateId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Template details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmailTemplate'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

    put:
      tags: [Templates]
      summary: Update email template
      operationId: updateTemplate
      security:
        - bearerAuth: []
      parameters:
        - name: templateId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EmailTemplateInput'
      responses:
        200:
          description: Template updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmailTemplate'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

    delete:
      tags: [Templates]
      summary: Delete email template
      operationId: deleteTemplate
      security:
        - bearerAuth: []
      parameters:
        - name: templateId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        204:
          description: Template deleted
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

  # Scraping Endpoints
  /scraping/jobs:
    get:
      tags: [Scraping]
      summary: List scraping jobs
      operationId: listScrapingJobs
      security:
        - bearerAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, running, completed, failed, all]
            default: all
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        200:
          description: Job list
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobs:
                    type: array
                    items:
                      $ref: '#/components/schemas/ScrapingJob'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        401:
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Scraping]
      summary: Create scraping job
      operationId: createScrapingJob
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [calendarId, schedule]
              properties:
                calendarId:
                  type: string
                  format: uuid
                schedule:
                  type: object
                  properties:
                    frequency:
                      type: string
                      enum: [once, hourly, daily, weekly]
                    time:
                      type: string
                      format: time
                    timezone:
                      type: string
      responses:
        201:
          description: Job created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ScrapingJob'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'

  /scraping/jobs/{jobId}:
    get:
      tags: [Scraping]
      summary: Get scraping job details
      operationId: getScrapingJob
      security:
        - bearerAuth: []
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Job details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ScrapingJob'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

    delete:
      tags: [Scraping]
      summary: Cancel scraping job
      operationId: cancelScrapingJob
      security:
        - bearerAuth: []
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        204:
          description: Job cancelled
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'

  /scraping/jobs/{jobId}/run:
    post:
      tags: [Scraping]
      summary: Manually trigger scraping job
      operationId: runScrapingJob
      security:
        - bearerAuth: []
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        202:
          description: Job started
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ScrapingJob'
        401:
          $ref: '#/components/responses/Unauthorized'
        404:
          $ref: '#/components/responses/NotFound'
        409:
          $ref: '#/components/responses/Conflict'

  # Analytics Endpoints
  /analytics/usage:
    get:
      tags: [Analytics]
      summary: Get usage statistics
      operationId: getUsageStats
      security:
        - bearerAuth: []
      parameters:
        - name: startDate
          in: query
          required: true
          schema:
            type: string
            format: date
        - name: endDate
          in: query
          required: true
          schema:
            type: string
            format: date
        - name: groupBy
          in: query
          schema:
            type: string
            enum: [day, week, month]
            default: day
      responses:
        200:
          description: Usage statistics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageStats'
        400:
          $ref: '#/components/responses/BadRequest'
        401:
          $ref: '#/components/responses/Unauthorized'

  /analytics/patterns:
    get:
      tags: [Analytics]
      summary: Get availability patterns
      operationId: getAvailabilityPatterns
      security:
        - bearerAuth: []
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [week, month, quarter, year]
            default: month
      responses:
        200:
          description: Availability patterns
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AvailabilityPatterns'
        401:
          $ref: '#/components/responses/Unauthorized'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    refreshToken:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
    CalendarIdParam:
      name: calendarId
      in: path
      required: true
      schema:
        type: string
        format: uuid

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Forbidden:
      description: Forbidden
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFound:
      description: Not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Conflict:
      description: Conflict
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    TooManyRequests:
      description: Too many requests
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
      headers:
        Retry-After:
          schema:
            type: integer
        X-RateLimit-Limit:
          schema:
            type: integer
        X-RateLimit-Remaining:
          schema:
            type: integer
        X-RateLimit-Reset:
          schema:
            type: integer

  schemas:
    # Authentication Schemas
    AuthResponse:
      type: object
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        expiresIn:
          type: integer
        tokenType:
          type: string
          default: Bearer
        user:
          $ref: '#/components/schemas/User'

    OAuthResponse:
      type: object
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        scope:
          type: string
        expiresIn:
          type: integer

    # User Schema
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        timezone:
          type: string
        preferences:
          type: object
          properties:
            workingHours:
              type: object
              properties:
                start:
                  type: string
                  format: time
                end:
                  type: string
                  format: time
                days:
                  type: array
                  items:
                    type: string
                    enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
            bufferTime:
              type: integer
              minimum: 0
              maximum: 60
            defaultMeetingDuration:
              type: integer
              minimum: 15
              maximum: 480
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    # Calendar Schemas
    Calendar:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        type:
          type: string
          enum: [google, external]
        name:
          type: string
        email:
          type: string
          format: email
        color:
          type: string
          pattern: '^#[0-9A-Fa-f]{6}$'
        syncEnabled:
          type: boolean
        isDefault:
          type: boolean
        syncStatus:
          $ref: '#/components/schemas/SyncStatus'
        lastSyncAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time

    GoogleCalendarConnection:
      type: object
      required: [type, accessToken]
      properties:
        type:
          type: string
          enum: [google]
        accessToken:
          type: string
        refreshToken:
          type: string

    ExternalCalendarConnection:
      type: object
      required: [type, url, credentials]
      properties:
        type:
          type: string
          enum: [external]
        url:
          type: string
          format: uri
        credentials:
          type: object
          properties:
            username:
              type: string
            password:
              type: string
              format: password
            otpSecret:
              type: string

    SyncStatus:
      type: object
      properties:
        status:
          type: string
          enum: [idle, syncing, completed, failed]
        lastSyncAt:
          type: string
          format: date-time
        nextSyncAt:
          type: string
          format: date-time
        eventsProcessed:
          type: integer
        errors:
          type: array
          items:
            type: string

    # Event Schemas
    Event:
      type: object
      properties:
        id:
          type: string
          format: uuid
        calendarId:
          type: string
          format: uuid
        externalId:
          type: string
        title:
          type: string
        description:
          type: string
        location:
          type: string
        startTime:
          type: string
          format: date-time
        endTime:
          type: string
          format: date-time
        isAllDay:
          type: boolean
        status:
          type: string
          enum: [confirmed, tentative, cancelled]
        visibility:
          type: string
          enum: [public, private]
        attendees:
          type: array
          items:
            $ref: '#/components/schemas/Attendee'
        recurrence:
          $ref: '#/components/schemas/RecurrenceRule'
        reminders:
          type: array
          items:
            type: object
            properties:
              method:
                type: string
                enum: [email, popup]
              minutes:
                type: integer
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    Attendee:
      type: object
      properties:
        email:
          type: string
          format: email
        name:
          type: string
        responseStatus:
          type: string
          enum: [accepted, declined, tentative, needsAction]
        optional:
          type: boolean
        organizer:
          type: boolean

    RecurrenceRule:
      type: object
      properties:
        frequency:
          type: string
          enum: [daily, weekly, monthly, yearly]
        interval:
          type: integer
          minimum: 1
        count:
          type: integer
          minimum: 1
        until:
          type: string
          format: date-time
        byDay:
          type: array
          items:
            type: string
            enum: [MO, TU, WE, TH, FR, SA, SU]
        byMonth:
          type: array
          items:
            type: integer
            minimum: 1
            maximum: 12
        byMonthDay:
          type: array
          items:
            type: integer
            minimum: 1
            maximum: 31

    # Availability Schemas
    TimeSlot:
      type: object
      properties:
        start:
          type: string
          format: date-time
        end:
          type: string
          format: date-time
        available:
          type: boolean
        score:
          type: number
          format: float
          minimum: 0
          maximum: 1
          description: Availability score (1.0 = perfect, 0.0 = worst)

    Conflict:
      type: object
      properties:
        timeSlot:
          $ref: '#/components/schemas/TimeSlot'
        conflictingEvents:
          type: array
          items:
            $ref: '#/components/schemas/Event'

    MeetingSuggestion:
      type: object
      properties:
        timeSlot:
          $ref: '#/components/schemas/TimeSlot'
        score:
          type: number
          format: float
          minimum: 0
          maximum: 1
        attendeeAvailability:
          type: array
          items:
            type: object
            properties:
              email:
                type: string
                format: email
              available:
                type: boolean
              conflicts:
                type: array
                items:
                  type: string
        reasons:
          type: array
          items:
            type: string
            description: Reasons for the score/ranking

    # Email Schemas
    AvailabilityRequest:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        messageId:
          type: string
        threadId:
          type: string
        from:
          type: object
          properties:
            email:
              type: string
              format: email
            name:
              type: string
        subject:
          type: string
        body:
          type: string
        proposedTimes:
          type: array
          items:
            $ref: '#/components/schemas/TimeSlot'
        status:
          type: string
          enum: [pending, responded, scheduled]
        response:
          $ref: '#/components/schemas/EmailResponse'
        createdAt:
          type: string
          format: date-time
        respondedAt:
          type: string
          format: date-time

    EmailResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        requestId:
          type: string
          format: uuid
        messageId:
          type: string
        to:
          type: string
          format: email
        subject:
          type: string
        body:
          type: string
        templateUsed:
          type: string
          format: uuid
        sentAt:
          type: string
          format: date-time
        status:
          type: string
          enum: [sent, delivered, bounced, failed]

    EmailTemplate:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        name:
          type: string
        type:
          type: string
          enum: [availability, confirmation, decline]
        subject:
          type: string
        body:
          type: string
        variables:
          type: array
          items:
            type: string
        isDefault:
          type: boolean
        language:
          type: string
          default: en
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    EmailTemplateInput:
      type: object
      required: [name, type, subject, body]
      properties:
        name:
          type: string
        type:
          type: string
          enum: [availability, confirmation, decline]
        subject:
          type: string
        body:
          type: string
        isDefault:
          type: boolean
        language:
          type: string
          default: en

    MonitoringStatus:
      type: object
      properties:
        enabled:
          type: boolean
        lastCheck:
          type: string
          format: date-time
        nextCheck:
          type: string
          format: date-time
        filters:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
            senders:
              type: array
              items:
                type: string
                format: email
        statistics:
          type: object
          properties:
            emailsProcessed:
              type: integer
            requestsDetected:
              type: integer
            responsessSent:
              type: integer

    # Scraping Schemas
    ScrapingJob:
      type: object
      properties:
        id:
          type: string
          format: uuid
        calendarId:
          type: string
          format: uuid
        status:
          type: string
          enum: [pending, running, completed, failed]
        schedule:
          type: object
          properties:
            frequency:
              type: string
              enum: [once, hourly, daily, weekly]
            time:
              type: string
              format: time
            timezone:
              type: string
        lastRunAt:
          type: string
          format: date-time
        nextRunAt:
          type: string
          format: date-time
        statistics:
          type: object
          properties:
            eventsExtracted:
              type: integer
            eventsAdded:
              type: integer
            eventsUpdated:
              type: integer
            eventsDeleted:
              type: integer
            duration:
              type: integer
              description: Execution time in seconds
        error:
          type: object
          properties:
            message:
              type: string
            code:
              type: string
            timestamp:
              type: string
              format: date-time
        createdAt:
          type: string
          format: date-time

    # Analytics Schemas
    UsageStats:
      type: object
      properties:
        period:
          type: object
          properties:
            start:
              type: string
              format: date
            end:
              type: string
              format: date
        metrics:
          type: object
          properties:
            totalUsers:
              type: integer
            activeUsers:
              type: integer
            calendarsConnected:
              type: integer
            eventsProcessed:
              type: integer
            availabilityChecks:
              type: integer
            emailsProcessed:
              type: integer
            responsesGenerated:
              type: integer
        timeSeries:
          type: array
          items:
            type: object
            properties:
              date:
                type: string
                format: date
              values:
                type: object
                additionalProperties:
                  type: number

    AvailabilityPatterns:
      type: object
      properties:
        period:
          type: string
          enum: [week, month, quarter, year]
        patterns:
          type: object
          properties:
            busyTimes:
              type: array
              items:
                type: object
                properties:
                  dayOfWeek:
                    type: string
                    enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
                  timeRanges:
                    type: array
                    items:
                      type: object
                      properties:
                        start:
                          type: string
                          format: time
                        end:
                          type: string
                          format: time
                        frequency:
                          type: number
                          format: float
                          minimum: 0
                          maximum: 1
            preferredMeetingTimes:
              type: array
              items:
                type: object
                properties:
                  time:
                    type: string
                    format: time
                  duration:
                    type: integer
                  frequency:
                    type: number
                    format: float
            averageMeetingDuration:
              type: integer
            meetingsPerDay:
              type: number
              format: float

    # Common Schemas
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
        hasNext:
          type: boolean
        hasPrevious:
          type: boolean

    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object
          additionalProperties: true
        timestamp:
          type: string
          format: date-time
```

---

## API Usage Examples

### Authentication Flow
```bash
# 1. Login
curl -X POST https://api.cams.example.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secure123"}'

# 2. Use access token for subsequent requests
curl -X GET https://api.cams.example.com/v1/calendars \
  -H "Authorization: Bearer <access_token>"

# 3. Refresh token when expired
curl -X POST https://api.cams.example.com/v1/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
```

### Calendar Operations
```bash
# Connect Google Calendar
curl -X POST https://api.cams.example.com/v1/calendars \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "google",
    "accessToken": "<google_access_token>",
    "refreshToken": "<google_refresh_token>"
  }'

# Trigger sync
curl -X POST https://api.cams.example.com/v1/calendars/{id}/sync \
  -H "Authorization: Bearer <token>"
```

### Availability Check
```bash
# Check availability for next week
curl -X GET "https://api.cams.example.com/v1/availability?\
startDate=2025-11-20T00:00:00Z&\
endDate=2025-11-27T23:59:59Z&\
duration=60&\
workingHoursOnly=true" \
  -H "Authorization: Bearer <token>"

# Get meeting suggestions
curl -X POST https://api.cams.example.com/v1/availability/suggest \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": ["john@example.com", "jane@example.com"],
    "duration": 60,
    "dateRange": {
      "start": "2025-11-20T00:00:00Z",
      "end": "2025-11-24T23:59:59Z"
    },
    "preferences": {
      "preferredTimes": ["afternoon"],
      "avoidDays": ["friday"],
      "bufferTime": 15
    }
  }'
```

---

## Rate Limiting

All API endpoints are subject to rate limiting:

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|----------------|---------------|--------------|
| Free | 60 | 1,000 | 10,000 |
| Pro | 300 | 10,000 | 100,000 |
| Enterprise | 1,000 | 50,000 | 1,000,000 |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait before retry (on 429 responses)

---

## Webhooks

The system supports webhooks for real-time notifications:

### Webhook Events
- `calendar.connected`
- `calendar.disconnected`
- `calendar.sync.completed`
- `event.created`
- `event.updated`
- `event.deleted`
- `availability.request.received`
- `availability.response.sent`
- `scraping.job.completed`
- `scraping.job.failed`

### Webhook Payload
```json
{
  "event": "calendar.sync.completed",
  "timestamp": "2025-11-18T10:30:00Z",
  "data": {
    "calendarId": "uuid",
    "eventsProcessed": 42,
    "duration": 3.5
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 1001 | Invalid credentials |
| 1002 | Token expired |
| 1003 | Insufficient permissions |
| 2001 | Calendar not found |
| 2002 | Calendar sync failed |
| 2003 | Calendar already connected |
| 3001 | Invalid date range |
| 3002 | No availability found |
| 4001 | Email template not found |
| 4002 | Invalid template variables |
| 5001 | Scraping job failed |
| 5002 | Authentication failed for external calendar |
| 9001 | Internal server error |
| 9002 | Service unavailable |

---

*This API specification defines the complete interface for the Calendar Availability Management System.*