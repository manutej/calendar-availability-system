# Calendar Availability Management System - Integration Patterns

**Version**: 1.0.0
**Created**: 2025-11-18
**Focus**: MCP (Model Context Protocol) Integration Patterns

## Overview

This document defines the integration patterns for connecting with external services, primarily through MCP (Model Context Protocol) for Google Calendar and Gmail, supplemented by direct API integrations and web scraping for non-MCP sources.

---

## MCP Integration Architecture

### MCP Client Architecture

```typescript
// Core MCP client abstraction
interface MCPClient<T> {
    connect(config: MCPConfig): Promise<void>;
    disconnect(): Promise<void>;
    subscribe(event: string, handler: EventHandler): void;
    unsubscribe(event: string, handler: EventHandler): void;
    execute<R>(method: string, params: any): Promise<R>;
    getStatus(): ConnectionStatus;
}

// MCP configuration
interface MCPConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
    credentials?: OAuthCredentials;
}

// Connection status tracking
interface ConnectionStatus {
    connected: boolean;
    lastActivity: Date;
    errorCount: number;
    retryAfter?: Date;
}
```

### MCP Service Registry

```typescript
// Service registry for managing multiple MCP connections
class MCPServiceRegistry {
    private services: Map<string, MCPClient<any>>;
    private healthChecker: HealthChecker;

    async registerService(
        name: string,
        client: MCPClient<any>,
        config: MCPConfig
    ): Promise<void> {
        await client.connect(config);
        this.services.set(name, client);
        this.healthChecker.monitor(name, client);
    }

    getService<T>(name: string): MCPClient<T> {
        const service = this.services.get(name);
        if (!service) throw new ServiceNotFoundError(name);
        return service as MCPClient<T>;
    }

    async healthCheck(): Promise<HealthReport[]> {
        return Promise.all(
            Array.from(this.services.entries()).map(
                async ([name, client]) => ({
                    service: name,
                    status: client.getStatus(),
                    healthy: await this.isHealthy(client)
                })
            )
        );
    }
}
```

---

## Google Calendar MCP Integration

### Calendar MCP Client Implementation

```typescript
class GoogleCalendarMCPClient implements MCPClient<CalendarAPI> {
    private connection?: MCPConnection;
    private eventEmitter: EventEmitter;
    private retryPolicy: RetryPolicy;

    async connect(config: MCPConfig): Promise<void> {
        try {
            // Initialize MCP connection
            this.connection = await MCPConnection.create({
                service: 'google-calendar',
                version: 'v3',
                auth: {
                    type: 'oauth2',
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    redirectUri: config.redirectUri,
                    scopes: config.scopes
                }
            });

            // Set up event listeners
            this.setupEventListeners();

            // Verify connection
            await this.verifyConnection();

        } catch (error) {
            throw new MCPConnectionError('Failed to connect to Google Calendar', error);
        }
    }

    private setupEventListeners(): void {
        if (!this.connection) return;

        // Calendar events
        this.connection.on('calendar.created', this.handleCalendarCreated.bind(this));
        this.connection.on('calendar.updated', this.handleCalendarUpdated.bind(this));
        this.connection.on('calendar.deleted', this.handleCalendarDeleted.bind(this));

        // Event changes
        this.connection.on('event.created', this.handleEventCreated.bind(this));
        this.connection.on('event.updated', this.handleEventUpdated.bind(this));
        this.connection.on('event.deleted', this.handleEventDeleted.bind(this));

        // Sync events
        this.connection.on('sync.started', this.handleSyncStarted.bind(this));
        this.connection.on('sync.completed', this.handleSyncCompleted.bind(this));
        this.connection.on('sync.error', this.handleSyncError.bind(this));
    }

    async execute<R>(method: string, params: any): Promise<R> {
        return this.retryPolicy.execute(async () => {
            if (!this.connection) throw new NotConnectedError();
            return await this.connection.call(method, params);
        });
    }
}
```

### Calendar Operations

```typescript
class CalendarOperations {
    constructor(private mcpClient: GoogleCalendarMCPClient) {}

    // List calendars
    async listCalendars(userId: string): Promise<Calendar[]> {
        const response = await this.mcpClient.execute('calendarList.list', {
            showDeleted: false,
            showHidden: false
        });

        return response.items.map(this.transformCalendar);
    }

    // Get calendar events
    async getEvents(
        calendarId: string,
        timeMin: Date,
        timeMax: Date,
        syncToken?: string
    ): Promise<EventsResponse> {
        const params: any = {
            calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        };

        if (syncToken) {
            params.syncToken = syncToken;
        } else {
            params.showDeleted = true;
        }

        return await this.mcpClient.execute('events.list', params);
    }

    // Create event
    async createEvent(
        calendarId: string,
        event: EventInput
    ): Promise<Event> {
        return await this.mcpClient.execute('events.insert', {
            calendarId,
            resource: this.transformEventInput(event),
            sendUpdates: 'all'
        });
    }

    // Watch for changes
    async watchCalendar(calendarId: string): Promise<WatchChannel> {
        return await this.mcpClient.execute('events.watch', {
            calendarId,
            requestBody: {
                id: generateChannelId(),
                type: 'web_hook',
                address: getWebhookUrl('calendar', calendarId)
            }
        });
    }
}
```

### Calendar Sync Strategy

```typescript
class CalendarSyncManager {
    private syncQueue: Queue;
    private syncTokenStore: SyncTokenStore;

    async syncCalendar(calendarId: string): Promise<SyncResult> {
        const syncJob = await this.syncQueue.add({
            type: 'calendar_sync',
            calendarId,
            priority: Priority.NORMAL
        });

        return await this.executeSyncJob(syncJob);
    }

    private async executeSyncJob(job: SyncJob): Promise<SyncResult> {
        const { calendarId } = job.data;
        const syncToken = await this.syncTokenStore.get(calendarId);

        try {
            // Perform incremental or full sync
            const result = syncToken
                ? await this.incrementalSync(calendarId, syncToken)
                : await this.fullSync(calendarId);

            // Store new sync token
            if (result.nextSyncToken) {
                await this.syncTokenStore.set(calendarId, result.nextSyncToken);
            }

            // Update sync status
            await this.updateSyncStatus(calendarId, 'completed', result);

            return result;

        } catch (error) {
            await this.handleSyncError(calendarId, error);
            throw error;
        }
    }

    private async incrementalSync(
        calendarId: string,
        syncToken: string
    ): Promise<SyncResult> {
        const operations = new CalendarOperations(this.mcpClient);
        const response = await operations.getEvents(
            calendarId,
            null, // Not needed with sync token
            null, // Not needed with sync token
            syncToken
        );

        return {
            eventsCreated: response.created?.length || 0,
            eventsUpdated: response.updated?.length || 0,
            eventsDeleted: response.deleted?.length || 0,
            nextSyncToken: response.nextSyncToken
        };
    }

    private async fullSync(calendarId: string): Promise<SyncResult> {
        const operations = new CalendarOperations(this.mcpClient);
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 6); // 6 months back
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 12); // 12 months forward

        const response = await operations.getEvents(
            calendarId,
            timeMin,
            timeMax
        );

        // Store all events
        const events = response.items || [];
        await this.storeEvents(calendarId, events);

        return {
            eventsCreated: events.length,
            eventsUpdated: 0,
            eventsDeleted: 0,
            nextSyncToken: response.nextSyncToken
        };
    }
}
```

---

## Gmail MCP Integration

### Gmail MCP Client Implementation

```typescript
class GmailMCPClient implements MCPClient<GmailAPI> {
    private connection?: MCPConnection;
    private watchManager: WatchManager;

    async connect(config: MCPConfig): Promise<void> {
        this.connection = await MCPConnection.create({
            service: 'gmail',
            version: 'v1',
            auth: {
                type: 'oauth2',
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                redirectUri: config.redirectUri,
                scopes: config.scopes
            }
        });

        await this.setupWatching();
    }

    private async setupWatching(): Promise<void> {
        // Set up Gmail push notifications
        await this.watchManager.startWatching({
            labelIds: ['INBOX'],
            topicName: 'projects/cams/topics/gmail-notifications'
        });
    }

    async getMessages(query: string, maxResults: number = 50): Promise<Message[]> {
        const response = await this.execute('messages.list', {
            q: query,
            maxResults
        });

        const messages = [];
        for (const item of response.messages || []) {
            const fullMessage = await this.execute('messages.get', {
                id: item.id,
                format: 'full'
            });
            messages.push(fullMessage);
        }

        return messages;
    }

    async sendMessage(message: EmailMessage): Promise<SentMessage> {
        const raw = this.createRawMessage(message);
        return await this.execute('messages.send', { raw });
    }

    private createRawMessage(message: EmailMessage): string {
        const email = [
            `To: ${message.to}`,
            `Subject: ${message.subject}`,
            `Content-Type: ${message.contentType || 'text/plain'}; charset=UTF-8`,
            '',
            message.body
        ].join('\r\n');

        return Buffer.from(email).toString('base64url');
    }
}
```

### Email Processing Pipeline

```typescript
class EmailProcessingPipeline {
    private stages: ProcessingStage[] = [
        new MessageRetrievalStage(),
        new ClassificationStage(),
        new DataExtractionStage(),
        new IntentDetectionStage(),
        new ResponseGenerationStage(),
        new SendingStage()
    ];

    async process(messageId: string): Promise<ProcessingResult> {
        let context: ProcessingContext = {
            messageId,
            startTime: new Date(),
            metadata: {}
        };

        for (const stage of this.stages) {
            try {
                context = await stage.execute(context);

                if (context.shouldStop) {
                    break;
                }
            } catch (error) {
                context.error = error;
                await this.handleStageError(stage, context, error);

                if (!stage.canContinueOnError) {
                    break;
                }
            }
        }

        return this.createResult(context);
    }
}

// Classification stage
class ClassificationStage implements ProcessingStage {
    async execute(context: ProcessingContext): Promise<ProcessingContext> {
        const message = context.message;
        const classification = await this.classifier.classify(message);

        context.classification = classification;
        context.isSchedulingRequest = classification.intent === 'scheduling';
        context.confidence = classification.confidence;

        // Stop processing if not a scheduling request
        if (!context.isSchedulingRequest) {
            context.shouldStop = true;
        }

        return context;
    }
}

// Data extraction stage
class DataExtractionStage implements ProcessingStage {
    async execute(context: ProcessingContext): Promise<ProcessingContext> {
        const extractor = new SchedulingDataExtractor();
        const extractedData = await extractor.extract(context.message);

        context.proposedTimes = extractedData.times;
        context.participants = extractedData.participants;
        context.meetingDetails = extractedData.details;

        return context;
    }
}
```

### Email Monitoring Service

```typescript
class EmailMonitoringService {
    private gmailClient: GmailMCPClient;
    private processingPipeline: EmailProcessingPipeline;
    private pubsubClient: PubSubClient;

    async initialize(): Promise<void> {
        // Set up Pub/Sub subscription for Gmail notifications
        await this.pubsubClient.subscribe(
            'gmail-notifications',
            this.handleNotification.bind(this)
        );
    }

    private async handleNotification(message: PubSubMessage): Promise<void> {
        const data = JSON.parse(Buffer.from(message.data, 'base64').toString());

        if (data.emailAddress && data.historyId) {
            await this.processNewMessages(data.emailAddress, data.historyId);
        }
    }

    private async processNewMessages(
        emailAddress: string,
        historyId: string
    ): Promise<void> {
        // Get history of changes since last known history ID
        const history = await this.gmailClient.execute('history.list', {
            startHistoryId: await this.getLastHistoryId(emailAddress),
            historyTypes: ['messageAdded']
        });

        for (const record of history.history || []) {
            for (const message of record.messagesAdded || []) {
                await this.processingPipeline.process(message.message.id);
            }
        }

        // Update last history ID
        await this.updateLastHistoryId(emailAddress, historyId);
    }
}
```

---

## Web Scraping Integration

### Scraping Architecture

```typescript
class ScrapingService {
    private browserPool: BrowserPool;
    private scraperRegistry: Map<string, CalendarScraper>;

    constructor() {
        this.browserPool = new BrowserPool({
            maxConcurrency: 5,
            retireInstanceAfterUses: 100,
            launchOptions: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
    }

    async scrapeCalendar(
        url: string,
        credentials: Credentials,
        selectors: Selectors
    ): Promise<ScrapedData> {
        const scraper = this.getScraper(url);
        const browser = await this.browserPool.acquire();

        try {
            return await scraper.scrape(browser, url, credentials, selectors);
        } finally {
            await this.browserPool.release(browser);
        }
    }

    private getScraper(url: string): CalendarScraper {
        // Determine scraper based on URL pattern
        const domain = new URL(url).hostname;

        if (!this.scraperRegistry.has(domain)) {
            this.scraperRegistry.set(domain, new GenericCalendarScraper());
        }

        return this.scraperRegistry.get(domain)!;
    }
}
```

### Generic Calendar Scraper

```typescript
class GenericCalendarScraper implements CalendarScraper {
    async scrape(
        browser: Browser,
        url: string,
        credentials: Credentials,
        selectors: Selectors
    ): Promise<ScrapedData> {
        const page = await browser.newPage();

        try {
            // Navigate to calendar
            await page.goto(url, { waitUntil: 'networkidle2' });

            // Perform login if needed
            if (await this.requiresLogin(page)) {
                await this.login(page, credentials, selectors.login);
            }

            // Wait for calendar to load
            await page.waitForSelector(selectors.calendar.container);

            // Extract events
            const events = await this.extractEvents(page, selectors.calendar);

            return {
                success: true,
                events,
                extractedAt: new Date()
            };

        } catch (error) {
            // Take screenshot for debugging
            const screenshot = await page.screenshot({ fullPage: true });

            throw new ScrapingError(
                'Failed to scrape calendar',
                error,
                screenshot
            );

        } finally {
            await page.close();
        }
    }

    private async requiresLogin(page: Page): Promise<boolean> {
        // Check for common login indicators
        const loginSelectors = [
            'input[type="password"]',
            'button[type="submit"]',
            '#login',
            '.login-form'
        ];

        for (const selector of loginSelectors) {
            if (await page.$(selector)) {
                return true;
            }
        }

        return false;
    }

    private async login(
        page: Page,
        credentials: Credentials,
        loginSelectors: LoginSelectors
    ): Promise<void> {
        // Fill username
        await page.type(loginSelectors.username, credentials.username);

        // Fill password
        await page.type(loginSelectors.password, credentials.password);

        // Handle OTP if configured
        if (credentials.otpSecret && loginSelectors.otp) {
            const otp = generateOTP(credentials.otpSecret);
            await page.type(loginSelectors.otp, otp);
        }

        // Submit form
        await Promise.all([
            page.click(loginSelectors.submit),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);

        // Verify login success
        if (await this.requiresLogin(page)) {
            throw new LoginError('Login failed');
        }
    }

    private async extractEvents(
        page: Page,
        calendarSelectors: CalendarSelectors
    ): Promise<ExtractedEvent[]> {
        return await page.evaluate((selectors) => {
            const events: ExtractedEvent[] = [];
            const eventElements = document.querySelectorAll(selectors.event);

            eventElements.forEach((element) => {
                const title = element.querySelector(selectors.title)?.textContent;
                const time = element.querySelector(selectors.time)?.textContent;
                const location = element.querySelector(selectors.location)?.textContent;

                if (title && time) {
                    events.push({
                        title: title.trim(),
                        time: time.trim(),
                        location: location?.trim(),
                        rawElement: element.outerHTML
                    });
                }
            });

            return events;
        }, calendarSelectors);
    }
}
```

---

## Error Handling and Recovery

### Retry Strategies

```typescript
class RetryPolicy {
    constructor(
        private maxAttempts: number = 3,
        private backoffStrategy: BackoffStrategy = new ExponentialBackoff()
    ) {}

    async execute<T>(
        operation: () => Promise<T>,
        context?: RetryContext
    ): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (!this.shouldRetry(error, attempt)) {
                    throw error;
                }

                const delay = this.backoffStrategy.getDelay(attempt);
                await this.delay(delay);

                // Notify retry listeners
                this.onRetry(error, attempt, delay);
            }
        }

        throw new MaxRetriesExceededError(lastError!, this.maxAttempts);
    }

    private shouldRetry(error: any, attempt: number): boolean {
        // Don't retry on final attempt
        if (attempt >= this.maxAttempts) return false;

        // Check if error is retryable
        if (error.retryable === false) return false;

        // Retry on specific error codes
        const retryableCodes = [429, 500, 502, 503, 504];
        if (error.statusCode && retryableCodes.includes(error.statusCode)) {
            return true;
        }

        // Retry on network errors
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            return true;
        }

        return false;
    }
}

class ExponentialBackoff implements BackoffStrategy {
    constructor(
        private baseDelay: number = 1000,
        private maxDelay: number = 32000,
        private jitter: boolean = true
    ) {}

    getDelay(attempt: number): number {
        const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt - 1),
            this.maxDelay
        );

        if (this.jitter) {
            // Add random jitter (±25%)
            const jitterAmount = delay * 0.25;
            return delay + (Math.random() - 0.5) * jitterAmount;
        }

        return delay;
    }
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
    private state: 'closed' | 'open' | 'half-open' = 'closed';
    private failures: number = 0;
    private lastFailureTime?: Date;
    private successCount: number = 0;

    constructor(
        private threshold: number = 5,
        private timeout: number = 60000, // 1 minute
        private successThreshold: number = 3
    ) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (this.shouldAttemptReset()) {
                this.state = 'half-open';
            } else {
                throw new CircuitOpenError('Circuit breaker is open');
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failures = 0;

        if (this.state === 'half-open') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'closed';
                this.successCount = 0;
            }
        }
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = new Date();
        this.successCount = 0;

        if (this.failures >= this.threshold) {
            this.state = 'open';
        }
    }

    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) return false;

        const now = new Date();
        const elapsed = now.getTime() - this.lastFailureTime.getTime();

        return elapsed >= this.timeout;
    }
}
```

---

## Monitoring and Observability

### Integration Health Monitoring

```typescript
class IntegrationMonitor {
    private metrics: MetricsCollector;
    private alerts: AlertManager;

    async checkHealth(): Promise<HealthStatus> {
        const checks = await Promise.allSettled([
            this.checkMCPHealth(),
            this.checkScrapingHealth(),
            this.checkDatabaseHealth(),
            this.checkQueueHealth()
        ]);

        const status = this.aggregateHealth(checks);

        if (status.level === 'critical') {
            await this.alerts.send({
                severity: 'critical',
                message: 'Integration health critical',
                details: status
            });
        }

        return status;
    }

    private async checkMCPHealth(): Promise<ComponentHealth> {
        const registry = MCPServiceRegistry.getInstance();
        const services = await registry.healthCheck();

        const unhealthy = services.filter(s => !s.healthy);

        return {
            component: 'MCP',
            healthy: unhealthy.length === 0,
            details: {
                total: services.length,
                healthy: services.length - unhealthy.length,
                unhealthy: unhealthy.length,
                services: services.map(s => ({
                    name: s.service,
                    status: s.status
                }))
            }
        };
    }

    private async checkScrapingHealth(): Promise<ComponentHealth> {
        const jobs = await this.getScrapingJobs();
        const recentFailures = jobs.filter(
            j => j.status === 'failed' &&
            j.lastRunAt > new Date(Date.now() - 3600000) // Last hour
        );

        return {
            component: 'Scraping',
            healthy: recentFailures.length < 3,
            details: {
                totalJobs: jobs.length,
                activeJobs: jobs.filter(j => j.isActive).length,
                recentFailures: recentFailures.length,
                successRate: this.calculateSuccessRate(jobs)
            }
        };
    }
}
```

### Metrics Collection

```typescript
class IntegrationMetrics {
    private prometheus: PrometheusClient;

    constructor() {
        // Define metrics
        this.defineMetrics();
    }

    private defineMetrics(): void {
        // MCP metrics
        this.mcpRequestDuration = new prometheus.Histogram({
            name: 'mcp_request_duration_seconds',
            help: 'MCP request duration in seconds',
            labelNames: ['service', 'method', 'status']
        });

        this.mcpRequestTotal = new prometheus.Counter({
            name: 'mcp_requests_total',
            help: 'Total number of MCP requests',
            labelNames: ['service', 'method', 'status']
        });

        // Scraping metrics
        this.scrapingDuration = new prometheus.Histogram({
            name: 'scraping_duration_seconds',
            help: 'Scraping job duration in seconds',
            labelNames: ['site', 'status']
        });

        this.scrapingEventsExtracted = new prometheus.Gauge({
            name: 'scraping_events_extracted',
            help: 'Number of events extracted',
            labelNames: ['site']
        });

        // Email metrics
        this.emailProcessingDuration = new prometheus.Histogram({
            name: 'email_processing_duration_seconds',
            help: 'Email processing duration',
            labelNames: ['stage', 'status']
        });

        this.emailResponseTime = new prometheus.Histogram({
            name: 'email_response_time_seconds',
            help: 'Time to respond to email',
            buckets: [60, 300, 600, 1800, 3600] // 1min, 5min, 10min, 30min, 1hr
        });
    }

    recordMCPRequest(
        service: string,
        method: string,
        duration: number,
        status: 'success' | 'error'
    ): void {
        this.mcpRequestDuration
            .labels(service, method, status)
            .observe(duration);

        this.mcpRequestTotal
            .labels(service, method, status)
            .inc();
    }
}
```

---

## Security Patterns

### Token Management

```typescript
class TokenManager {
    private vault: SecretVault;
    private cache: TokenCache;

    async getAccessToken(userId: string, provider: string): Promise<string> {
        // Check cache first
        const cached = await this.cache.get(userId, provider);
        if (cached && !this.isExpiringSoon(cached)) {
            return cached.accessToken;
        }

        // Get from vault
        const stored = await this.vault.getSecret(`oauth/${userId}/${provider}`);

        // Refresh if needed
        if (this.isExpired(stored)) {
            const refreshed = await this.refreshToken(stored);
            await this.vault.setSecret(`oauth/${userId}/${provider}`, refreshed);
            await this.cache.set(userId, provider, refreshed);
            return refreshed.accessToken;
        }

        await this.cache.set(userId, provider, stored);
        return stored.accessToken;
    }

    private async refreshToken(token: OAuthToken): Promise<OAuthToken> {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: token.refreshToken,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            throw new TokenRefreshError('Failed to refresh token');
        }

        const data = await response.json();

        return {
            accessToken: data.access_token,
            refreshToken: token.refreshToken, // Refresh token doesn't change
            expiresAt: new Date(Date.now() + data.expires_in * 1000),
            scope: data.scope
        };
    }

    private isExpired(token: OAuthToken): boolean {
        return token.expiresAt < new Date();
    }

    private isExpiringSoon(token: OAuthToken): boolean {
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        return token.expiresAt < fiveMinutesFromNow;
    }
}
```

### Credential Encryption

```typescript
class CredentialVault {
    private kms: KeyManagementService;

    async storeCredentials(
        userId: string,
        service: string,
        credentials: any
    ): Promise<void> {
        // Encrypt credentials
        const encrypted = await this.kms.encrypt(
            JSON.stringify(credentials),
            `users/${userId}`
        );

        // Store in database
        await db.credentials.create({
            userId,
            service,
            encryptedData: encrypted,
            encryptionKeyId: `users/${userId}`,
            createdAt: new Date()
        });
    }

    async getCredentials(
        userId: string,
        service: string
    ): Promise<any> {
        const record = await db.credentials.findOne({
            where: { userId, service }
        });

        if (!record) {
            throw new CredentialsNotFoundError(userId, service);
        }

        // Decrypt credentials
        const decrypted = await this.kms.decrypt(
            record.encryptedData,
            record.encryptionKeyId
        );

        return JSON.parse(decrypted);
    }
}
```

---

## Testing Strategies

### Integration Testing

```typescript
describe('MCP Integration Tests', () => {
    let mcpClient: GoogleCalendarMCPClient;
    let testCalendarId: string;

    beforeAll(async () => {
        // Use test credentials
        mcpClient = new GoogleCalendarMCPClient();
        await mcpClient.connect({
            clientId: process.env.TEST_GOOGLE_CLIENT_ID!,
            clientSecret: process.env.TEST_GOOGLE_CLIENT_SECRET!,
            redirectUri: 'http://localhost:3000/oauth/callback',
            scopes: ['calendar.readonly', 'calendar.events']
        });

        // Create test calendar
        testCalendarId = await createTestCalendar();
    });

    afterAll(async () => {
        // Clean up test calendar
        await deleteTestCalendar(testCalendarId);
        await mcpClient.disconnect();
    });

    describe('Calendar Operations', () => {
        test('should list calendars', async () => {
            const operations = new CalendarOperations(mcpClient);
            const calendars = await operations.listCalendars('test-user');

            expect(calendars).toBeDefined();
            expect(Array.isArray(calendars)).toBe(true);
            expect(calendars.length).toBeGreaterThan(0);
        });

        test('should sync calendar events', async () => {
            const syncManager = new CalendarSyncManager();
            const result = await syncManager.syncCalendar(testCalendarId);

            expect(result.eventsCreated).toBeGreaterThanOrEqual(0);
            expect(result.nextSyncToken).toBeDefined();
        });

        test('should handle API rate limits', async () => {
            const operations = new CalendarOperations(mcpClient);

            // Make many requests to trigger rate limit
            const promises = Array(100).fill(0).map(() =>
                operations.listCalendars('test-user')
            );

            // Should handle rate limits gracefully
            await expect(Promise.all(promises)).resolves.toBeDefined();
        });
    });
});
```

### Mock MCP Server

```typescript
class MockMCPServer {
    private server: Server;
    private responses: Map<string, any>;

    constructor() {
        this.responses = new Map();
        this.setupDefaultResponses();
    }

    start(port: number = 8080): void {
        this.server = createServer((req, res) => {
            const url = new URL(req.url!, `http://localhost:${port}`);
            const path = url.pathname;

            if (this.responses.has(path)) {
                const response = this.responses.get(path);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        this.server.listen(port);
    }

    setResponse(path: string, response: any): void {
        this.responses.set(path, response);
    }

    private setupDefaultResponses(): void {
        // Calendar list response
        this.responses.set('/calendar/v3/users/me/calendarList', {
            items: [
                {
                    id: 'primary',
                    summary: 'Test Calendar',
                    timeZone: 'America/New_York'
                }
            ]
        });

        // Events list response
        this.responses.set('/calendar/v3/calendars/primary/events', {
            items: [
                {
                    id: 'test-event-1',
                    summary: 'Test Event',
                    start: { dateTime: '2025-11-20T10:00:00Z' },
                    end: { dateTime: '2025-11-20T11:00:00Z' }
                }
            ],
            nextSyncToken: 'test-sync-token'
        });
    }

    stop(): void {
        if (this.server) {
            this.server.close();
        }
    }
}
```

---

## Performance Optimization

### Connection Pooling

```typescript
class MCPConnectionPool {
    private pools: Map<string, ConnectionPool>;

    getPool(service: string): ConnectionPool {
        if (!this.pools.has(service)) {
            this.pools.set(service, new ConnectionPool({
                minConnections: 2,
                maxConnections: 10,
                idleTimeout: 300000, // 5 minutes
                connectionTimeout: 30000 // 30 seconds
            }));
        }

        return this.pools.get(service)!;
    }

    async getConnection(service: string): Promise<MCPConnection> {
        const pool = this.getPool(service);
        return await pool.acquire();
    }

    async releaseConnection(
        service: string,
        connection: MCPConnection
    ): Promise<void> {
        const pool = this.getPool(service);
        await pool.release(connection);
    }
}
```

### Batch Processing

```typescript
class BatchProcessor {
    async processBatch<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        options: BatchOptions = {}
    ): Promise<R[]> {
        const {
            batchSize = 10,
            concurrency = 3,
            retryOnFailure = true
        } = options;

        const batches = this.createBatches(items, batchSize);
        const results: R[] = [];

        // Process batches with controlled concurrency
        const queue = new PQueue({ concurrency });

        for (const batch of batches) {
            const batchPromises = batch.map(item =>
                queue.add(async () => {
                    if (retryOnFailure) {
                        const retryPolicy = new RetryPolicy();
                        return await retryPolicy.execute(() => processor(item));
                    } else {
                        return await processor(item);
                    }
                })
            );

            const batchResults = await Promise.allSettled(batchPromises);

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    // Log error but continue processing
                    console.error('Batch item failed:', result.reason);
                }
            }
        }

        return results;
    }

    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];

        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }

        return batches;
    }
}
```

---

*This integration patterns document provides comprehensive patterns and implementations for MCP-based calendar and email integration, along with web scraping capabilities for external sources.*