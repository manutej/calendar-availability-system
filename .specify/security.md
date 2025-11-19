# Calendar Availability Management System - Security Model

**Version**: 1.0.0
**Created**: 2025-11-18
**Compliance**: GDPR, CCPA, SOC 2 Type II, HIPAA-Ready

## Executive Summary

This document defines the comprehensive security model for the Calendar Availability Management System (CAMS), covering authentication, authorization, data protection, compliance requirements, and security operations. The model implements defense-in-depth with multiple security layers to protect user data and system integrity.

---

## Security Architecture

### Defense-in-Depth Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    External Perimeter                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   WAF & DDoS Protection              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   API Gateway & Rate Limiting        │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Authentication & Authorization          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Application Security                │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Data Encryption                   │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Database Security                  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                Infrastructure Security               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Security Zones

| Zone | Description | Security Level | Access Control |
|------|-------------|---------------|----------------|
| Public | External API endpoints | High | WAF, Rate limiting, DDoS protection |
| Application | Business logic layer | High | JWT validation, RBAC |
| Data | Database and storage | Critical | Encryption, RLS, Audit logging |
| Integration | External service connections | High | OAuth2, API keys, IP whitelisting |
| Management | Admin and monitoring | Critical | MFA, VPN, Audit trail |

---

## Authentication

### Authentication Methods

#### 1. Local Authentication
```typescript
interface LocalAuthenticationConfig {
    passwordPolicy: {
        minLength: 12;
        requireUppercase: true;
        requireLowercase: true;
        requireNumbers: true;
        requireSpecialChars: true;
        preventCommonPasswords: true;
        preventUserInfoInPassword: true;
        passwordHistory: 5; // Prevent last 5 passwords
        maxAge: 90; // Days
    };

    accountLockout: {
        maxAttempts: 5;
        lockoutDuration: 900; // 15 minutes in seconds
        resetAfter: 3600; // Reset counter after 1 hour
    };

    sessionManagement: {
        sessionTimeout: 1800; // 30 minutes
        absoluteTimeout: 43200; // 12 hours
        slidingExpiration: true;
        concurrentSessions: 3; // Max concurrent sessions
    };
}
```

#### 2. OAuth2/OpenID Connect
```typescript
interface OAuth2Config {
    providers: {
        google: {
            clientId: string;
            clientSecret: string;
            scopes: ['openid', 'email', 'profile', 'calendar'];
            discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration';
        };
        microsoft: {
            clientId: string;
            clientSecret: string;
            tenantId: string;
            scopes: ['openid', 'email', 'profile', 'Calendars.ReadWrite'];
        };
    };

    stateValidation: {
        useNonce: true;
        stateTTL: 600; // 10 minutes
        validateIssuer: true;
        validateAudience: true;
    };
}
```

#### 3. Multi-Factor Authentication (MFA)
```typescript
class MFAService {
    async setupTOTP(userId: string): Promise<TOTPSetup> {
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(
            userId,
            'CAMS',
            secret
        );

        // Store encrypted secret
        await this.storeSecret(userId, secret);

        return {
            secret,
            qrCode: await QRCode.toDataURL(otpauth),
            backupCodes: this.generateBackupCodes()
        };
    }

    async verifyTOTP(userId: string, token: string): Promise<boolean> {
        const secret = await this.getSecret(userId);

        return authenticator.verify({
            token,
            secret,
            window: 1 // Allow 1 step before/after for clock skew
        });
    }

    private generateBackupCodes(): string[] {
        return Array.from({ length: 10 }, () =>
            crypto.randomBytes(4).toString('hex').toUpperCase()
        );
    }
}
```

### JWT Token Management

```typescript
interface JWTConfig {
    signing: {
        algorithm: 'RS256';
        privateKey: string; // RSA private key
        publicKey: string; // RSA public key
        keyRotation: {
            enabled: true;
            interval: 2592000; // 30 days in seconds
            overlap: 86400; // 1 day overlap for rotation
        };
    };

    accessToken: {
        expiresIn: 900; // 15 minutes
        issuer: 'https://api.cams.example.com';
        audience: 'cams-api';
        claims: {
            sub: string; // User ID
            email: string;
            roles: string[];
            permissions: string[];
        };
    };

    refreshToken: {
        expiresIn: 604800; // 7 days
        rotateOnUse: true;
        family: string; // Token family for rotation tracking
    };
}

class JWTService {
    async generateTokenPair(user: User): Promise<TokenPair> {
        const accessToken = await this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user);

        // Store refresh token family
        await this.storeRefreshToken(user.id, refreshToken);

        return { accessToken, refreshToken };
    }

    async rotateRefreshToken(
        refreshToken: string
    ): Promise<TokenPair> {
        const decoded = await this.verifyRefreshToken(refreshToken);

        // Check if token family is valid
        if (!await this.isValidTokenFamily(decoded.family)) {
            // Potential token theft - invalidate all tokens
            await this.revokeAllTokens(decoded.sub);
            throw new SecurityError('Token theft detected');
        }

        // Generate new pair
        const user = await this.getUser(decoded.sub);
        return this.generateTokenPair(user);
    }
}
```

---

## Authorization

### Role-Based Access Control (RBAC)

```typescript
enum Role {
    ADMIN = 'admin',
    USER = 'user',
    VIEWER = 'viewer',
    SERVICE_ACCOUNT = 'service_account'
}

enum Permission {
    // Calendar permissions
    CALENDAR_READ = 'calendar:read',
    CALENDAR_WRITE = 'calendar:write',
    CALENDAR_DELETE = 'calendar:delete',
    CALENDAR_SHARE = 'calendar:share',

    // Event permissions
    EVENT_READ = 'event:read',
    EVENT_WRITE = 'event:write',
    EVENT_DELETE = 'event:delete',

    // Email permissions
    EMAIL_READ = 'email:read',
    EMAIL_SEND = 'email:send',
    EMAIL_TEMPLATE_MANAGE = 'email:template:manage',

    // Scraping permissions
    SCRAPING_MANAGE = 'scraping:manage',
    SCRAPING_CREDENTIALS = 'scraping:credentials',

    // Admin permissions
    USER_MANAGE = 'user:manage',
    SYSTEM_CONFIG = 'system:config',
    AUDIT_READ = 'audit:read'
}

const rolePermissions: Record<Role, Permission[]> = {
    [Role.ADMIN]: [
        Permission.CALENDAR_READ,
        Permission.CALENDAR_WRITE,
        Permission.CALENDAR_DELETE,
        Permission.CALENDAR_SHARE,
        Permission.EVENT_READ,
        Permission.EVENT_WRITE,
        Permission.EVENT_DELETE,
        Permission.EMAIL_READ,
        Permission.EMAIL_SEND,
        Permission.EMAIL_TEMPLATE_MANAGE,
        Permission.SCRAPING_MANAGE,
        Permission.SCRAPING_CREDENTIALS,
        Permission.USER_MANAGE,
        Permission.SYSTEM_CONFIG,
        Permission.AUDIT_READ
    ],
    [Role.USER]: [
        Permission.CALENDAR_READ,
        Permission.CALENDAR_WRITE,
        Permission.CALENDAR_SHARE,
        Permission.EVENT_READ,
        Permission.EVENT_WRITE,
        Permission.EVENT_DELETE,
        Permission.EMAIL_READ,
        Permission.EMAIL_SEND,
        Permission.EMAIL_TEMPLATE_MANAGE,
        Permission.SCRAPING_MANAGE,
        Permission.SCRAPING_CREDENTIALS
    ],
    [Role.VIEWER]: [
        Permission.CALENDAR_READ,
        Permission.EVENT_READ,
        Permission.EMAIL_READ
    ],
    [Role.SERVICE_ACCOUNT]: [
        Permission.CALENDAR_READ,
        Permission.EVENT_READ
    ]
};
```

### Attribute-Based Access Control (ABAC)

```typescript
interface AccessPolicy {
    resource: string;
    action: string;
    conditions: Condition[];
}

interface Condition {
    attribute: string;
    operator: 'equals' | 'contains' | 'in' | 'greater_than';
    value: any;
}

class ABACService {
    async canAccess(
        subject: Subject,
        resource: Resource,
        action: string
    ): Promise<boolean> {
        const policies = await this.getPolicies(resource.type);

        for (const policy of policies) {
            if (policy.action !== action) continue;

            const conditionsMet = policy.conditions.every(condition =>
                this.evaluateCondition(condition, subject, resource)
            );

            if (conditionsMet) return true;
        }

        return false;
    }

    private evaluateCondition(
        condition: Condition,
        subject: Subject,
        resource: Resource
    ): boolean {
        const value = this.getAttribute(condition.attribute, subject, resource);

        switch (condition.operator) {
            case 'equals':
                return value === condition.value;
            case 'contains':
                return value?.includes(condition.value);
            case 'in':
                return condition.value.includes(value);
            case 'greater_than':
                return value > condition.value;
            default:
                return false;
        }
    }
}
```

### Resource-Level Security

```typescript
class ResourceSecurity {
    async checkAccess(
        userId: string,
        resourceId: string,
        action: string
    ): Promise<boolean> {
        // Check ownership
        if (await this.isOwner(userId, resourceId)) {
            return true;
        }

        // Check explicit permissions
        const permissions = await this.getPermissions(userId, resourceId);
        if (permissions.includes(action)) {
            return true;
        }

        // Check shared access
        const shares = await this.getShares(resourceId);
        const userShare = shares.find(s => s.userId === userId);
        if (userShare && userShare.permissions.includes(action)) {
            return true;
        }

        return false;
    }

    async applyRowLevelSecurity(
        query: Query,
        userId: string
    ): Promise<Query> {
        return query.where(
            or(
                eq('owner_id', userId),
                exists(
                    select('1')
                        .from('shares')
                        .where(
                            and(
                                eq('resource_id', ref('id')),
                                eq('user_id', userId)
                            )
                        )
                )
            )
        );
    }
}
```

---

## Data Protection

### Encryption at Rest

```typescript
interface EncryptionConfig {
    algorithm: 'AES-256-GCM';
    keyManagement: {
        provider: 'AWS_KMS' | 'AZURE_KEY_VAULT' | 'GCP_KMS';
        masterKeyId: string;
        keyRotation: {
            enabled: true;
            interval: 7776000; // 90 days
        };
    };

    databaseEncryption: {
        enabled: true;
        encryptedColumns: [
            'oauth_tokens.access_token',
            'oauth_tokens.refresh_token',
            'scraping_jobs.auth_config',
            'user_preferences.notification_preferences'
        ];
    };

    fileEncryption: {
        enabled: true;
        encryptAttachments: true;
        encryptBackups: true;
    };
}

class EncryptionService {
    async encryptSensitiveData(
        data: string,
        context: string
    ): Promise<EncryptedData> {
        // Generate data encryption key (DEK)
        const dek = crypto.randomBytes(32);

        // Encrypt DEK with KEK from KMS
        const encryptedDEK = await this.kms.encrypt(dek, context);

        // Encrypt data with DEK
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);

        const encrypted = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();

        return {
            ciphertext: encrypted.toString('base64'),
            encryptedKey: encryptedDEK,
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            algorithm: 'AES-256-GCM'
        };
    }

    async decryptSensitiveData(
        encryptedData: EncryptedData,
        context: string
    ): Promise<string> {
        // Decrypt DEK with KMS
        const dek = await this.kms.decrypt(encryptedData.encryptedKey, context);

        // Decrypt data with DEK
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            dek,
            Buffer.from(encryptedData.iv, 'base64')
        );

        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encryptedData.ciphertext, 'base64')),
            decipher.final()
        ]);

        return decrypted.toString('utf8');
    }
}
```

### Encryption in Transit

```typescript
interface TLSConfig {
    minVersion: 'TLSv1.3';
    cipherSuites: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_AES_128_GCM_SHA256',
        'TLS_CHACHA20_POLY1305_SHA256'
    ];

    certificates: {
        cert: string; // Server certificate
        key: string; // Private key
        ca: string[]; // Certificate chain
        rotation: {
            enabled: true;
            daysBeforeExpiry: 30;
        };
    };

    hsts: {
        enabled: true;
        maxAge: 31536000; // 1 year
        includeSubDomains: true;
        preload: true;
    };

    certificatePinning: {
        enabled: true;
        pins: string[]; // SHA256 hashes of certificates
        backupPins: string[]; // Backup pins for rotation
        maxAge: 5184000; // 60 days
    };
}
```

### Data Masking and Anonymization

```typescript
class DataMaskingService {
    maskPII(data: any): any {
        const masked = { ...data };

        // Email masking
        if (masked.email) {
            masked.email = this.maskEmail(masked.email);
        }

        // Name masking
        if (masked.name) {
            masked.name = this.maskName(masked.name);
        }

        // Phone masking
        if (masked.phone) {
            masked.phone = this.maskPhone(masked.phone);
        }

        // Credit card masking
        if (masked.creditCard) {
            masked.creditCard = this.maskCreditCard(masked.creditCard);
        }

        return masked;
    }

    private maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        const maskedLocal = local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
        return `${maskedLocal}@${domain}`;
    }

    private maskName(name: string): string {
        const parts = name.split(' ');
        return parts.map(part =>
            part[0] + '*'.repeat(part.length - 1)
        ).join(' ');
    }

    private maskPhone(phone: string): string {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.slice(0, 3) + '*'.repeat(cleaned.length - 6) + cleaned.slice(-3);
    }

    private maskCreditCard(card: string): string {
        const cleaned = card.replace(/\D/g, '');
        return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
    }
}
```

---

## API Security

### Rate Limiting

```typescript
interface RateLimitConfig {
    global: {
        windowMs: 60000; // 1 minute
        max: 1000; // requests per window
    };

    perEndpoint: {
        '/auth/login': {
            windowMs: 900000; // 15 minutes
            max: 5;
            skipSuccessfulRequests: false;
        };
        '/calendars/sync': {
            windowMs: 60000;
            max: 10;
        };
        '/email/send': {
            windowMs: 3600000; // 1 hour
            max: 100;
        };
    };

    perUser: {
        windowMs: 60000;
        max: 100;
        keyGenerator: (req: Request) => req.user?.id || req.ip;
    };

    distributed: {
        enabled: true;
        store: 'redis';
        prefix: 'rate_limit:';
    };
}

class RateLimiter {
    async checkLimit(
        key: string,
        limit: number,
        window: number
    ): Promise<boolean> {
        const current = await this.redis.incr(key);

        if (current === 1) {
            await this.redis.expire(key, window);
        }

        if (current > limit) {
            const ttl = await this.redis.ttl(key);
            throw new RateLimitError(
                `Rate limit exceeded. Try again in ${ttl} seconds.`,
                ttl
            );
        }

        return true;
    }
}
```

### Input Validation

```typescript
class InputValidator {
    validateRequest(schema: Schema, data: any): void {
        // SQL Injection prevention
        this.checkSQLInjection(data);

        // XSS prevention
        this.sanitizeHTML(data);

        // Path traversal prevention
        this.checkPathTraversal(data);

        // Schema validation
        const result = schema.safeParse(data);
        if (!result.success) {
            throw new ValidationError(result.error);
        }
    }

    private checkSQLInjection(data: any): void {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
            /(--)|(\|\|)|(;)/g,
            /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
            /(\bAND\b\s*\d+\s*=\s*\d+)/gi
        ];

        const checkValue = (value: any) => {
            if (typeof value === 'string') {
                for (const pattern of sqlPatterns) {
                    if (pattern.test(value)) {
                        throw new SecurityError('Potential SQL injection detected');
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                Object.values(value).forEach(checkValue);
            }
        };

        checkValue(data);
    }

    private sanitizeHTML(data: any): void {
        const sanitizeValue = (value: any): any => {
            if (typeof value === 'string') {
                return DOMPurify.sanitize(value, {
                    ALLOWED_TAGS: [],
                    ALLOWED_ATTR: []
                });
            } else if (typeof value === 'object' && value !== null) {
                const sanitized: any = {};
                for (const [key, val] of Object.entries(value)) {
                    sanitized[key] = sanitizeValue(val);
                }
                return sanitized;
            }
            return value;
        };

        return sanitizeValue(data);
    }

    private checkPathTraversal(data: any): void {
        const pathPatterns = [
            /\.\./g,
            /\.\.%2F/gi,
            /%2E%2E/gi,
            /\.\.\\/g
        ];

        const checkValue = (value: any) => {
            if (typeof value === 'string') {
                for (const pattern of pathPatterns) {
                    if (pattern.test(value)) {
                        throw new SecurityError('Path traversal attempt detected');
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                Object.values(value).forEach(checkValue);
            }
        };

        checkValue(data);
    }
}
```

### CORS Configuration

```typescript
interface CORSConfig {
    origin: (origin: string, callback: Function) => void;
    credentials: true;
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'X-Correlation-ID'
    ];
    exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
    ];
    maxAge: 86400; // 24 hours
    preflightContinue: false;
}

const corsConfig: CORSConfig = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://app.cams.example.com',
            'https://staging.cams.example.com'
        ];

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation'));
        }
    },
    // ... rest of config
};
```

---

## Secret Management

### Secret Storage

```typescript
class SecretVault {
    private kms: KeyManagementService;
    private cache: SecretCache;

    async storeSecret(
        path: string,
        secret: any,
        metadata?: any
    ): Promise<void> {
        const encrypted = await this.kms.encrypt(
            JSON.stringify(secret),
            path
        );

        await this.vault.write(path, {
            data: encrypted,
            metadata: {
                ...metadata,
                createdAt: new Date(),
                version: await this.getNextVersion(path)
            }
        });

        // Invalidate cache
        this.cache.delete(path);
    }

    async getSecret(path: string): Promise<any> {
        // Check cache first
        const cached = this.cache.get(path);
        if (cached) return cached;

        const encrypted = await this.vault.read(path);
        if (!encrypted) {
            throw new SecretNotFoundError(path);
        }

        const decrypted = await this.kms.decrypt(
            encrypted.data,
            path
        );

        const secret = JSON.parse(decrypted);

        // Cache with TTL
        this.cache.set(path, secret, 300); // 5 minutes

        return secret;
    }

    async rotateSecret(path: string): Promise<void> {
        const current = await this.getSecret(path);
        const rotated = await this.generateNewSecret(current.type);

        // Store new version
        await this.storeSecret(path, rotated, {
            rotatedFrom: current.version,
            rotatedAt: new Date()
        });

        // Keep old version for rollback
        await this.archiveSecret(path, current);

        // Update dependent services
        await this.updateDependencies(path, rotated);
    }
}
```

### API Key Management

```typescript
class APIKeyManager {
    async generateAPIKey(
        userId: string,
        name: string,
        scopes: string[]
    ): Promise<APIKey> {
        const key = this.generateSecureKey();
        const hashedKey = await this.hashKey(key);

        const apiKey = await db.apiKeys.create({
            userId,
            name,
            keyHash: hashedKey,
            keyPrefix: key.substring(0, 8),
            scopes,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            lastUsedAt: null,
            createdAt: new Date()
        });

        return {
            id: apiKey.id,
            key: key, // Only returned once
            name: name,
            scopes: scopes,
            expiresAt: apiKey.expiresAt
        };
    }

    private generateSecureKey(): string {
        const prefix = 'cams';
        const random = crypto.randomBytes(32).toString('base64url');
        return `${prefix}_${random}`;
    }

    private async hashKey(key: string): Promise<string> {
        return crypto
            .createHash('sha256')
            .update(key)
            .digest('hex');
    }

    async validateAPIKey(key: string): Promise<APIKeyValidation> {
        const hashedKey = await this.hashKey(key);

        const apiKey = await db.apiKeys.findOne({
            where: { keyHash: hashedKey }
        });

        if (!apiKey) {
            throw new InvalidAPIKeyError();
        }

        if (apiKey.expiresAt < new Date()) {
            throw new ExpiredAPIKeyError();
        }

        if (apiKey.revokedAt) {
            throw new RevokedAPIKeyError();
        }

        // Update last used
        await db.apiKeys.update(
            { lastUsedAt: new Date() },
            { where: { id: apiKey.id } }
        );

        return {
            userId: apiKey.userId,
            scopes: apiKey.scopes,
            rateLimits: apiKey.rateLimits
        };
    }
}
```

---

## Compliance

### GDPR Compliance

```typescript
class GDPRCompliance {
    // Right to Access
    async exportUserData(userId: string): Promise<UserDataExport> {
        const data = await this.collectUserData(userId);

        return {
            personalData: data.personal,
            calendarData: data.calendars,
            emailData: data.emails,
            activityLogs: data.logs,
            exportedAt: new Date(),
            format: 'JSON'
        };
    }

    // Right to Erasure
    async deleteUserData(userId: string): Promise<void> {
        // Start transaction
        await db.transaction(async (trx) => {
            // Delete in correct order due to foreign keys
            await trx.delete('audit_logs').where({ userId });
            await trx.delete('email_responses').where({ userId });
            await trx.delete('availability_requests').where({ userId });
            await trx.delete('events').where({ userId });
            await trx.delete('calendars').where({ userId });
            await trx.delete('oauth_tokens').where({ userId });
            await trx.delete('user_preferences').where({ userId });
            await trx.delete('users').where({ id: userId });
        });

        // Delete from cache
        await this.cache.deletePattern(`user:${userId}:*`);

        // Delete from backups (mark for deletion)
        await this.markForDeletionInBackups(userId);
    }

    // Right to Rectification
    async updateUserData(
        userId: string,
        updates: Partial<UserData>
    ): Promise<void> {
        await db.users.update(updates, { where: { id: userId } });

        // Audit the change
        await this.auditDataChange(userId, 'rectification', updates);
    }

    // Data Portability
    async exportPortableData(userId: string): Promise<Buffer> {
        const data = await this.exportUserData(userId);

        // Convert to standard format (e.g., CSV, JSON)
        const portable = this.convertToPortableFormat(data);

        // Sign the export for integrity
        const signature = await this.signData(portable);

        return Buffer.from(JSON.stringify({
            data: portable,
            signature,
            exportedAt: new Date(),
            format: 'application/json'
        }));
    }

    // Consent Management
    async updateConsent(
        userId: string,
        consents: ConsentUpdate[]
    ): Promise<void> {
        for (const consent of consents) {
            await db.consents.upsert({
                userId,
                purpose: consent.purpose,
                granted: consent.granted,
                grantedAt: consent.granted ? new Date() : null,
                revokedAt: !consent.granted ? new Date() : null
            });

            // Update dependent features
            if (!consent.granted) {
                await this.disableFeature(userId, consent.purpose);
            }
        }
    }
}
```

### CCPA Compliance

```typescript
class CCPACompliance {
    // Right to Know
    async getDataCollection(userId: string): Promise<DataCollection> {
        return {
            categoriesCollected: [
                'Identifiers',
                'Internet Activity',
                'Geolocation Data',
                'Professional Information'
            ],
            sourcesOfCollection: [
                'Direct from User',
                'Google Calendar API',
                'Gmail API',
                'Web Scraping'
            ],
            purposesOfCollection: [
                'Service Provision',
                'Analytics',
                'Security',
                'Legal Compliance'
            ],
            categoriesSold: [], // We don't sell data
            categoriesShared: [
                'Calendar Data with Google',
                'Email Data with Gmail'
            ]
        };
    }

    // Right to Delete
    async deleteCaliforniaUserData(userId: string): Promise<void> {
        // Same as GDPR deletion
        await this.gdprCompliance.deleteUserData(userId);
    }

    // Right to Opt-Out
    async optOutOfSale(userId: string): Promise<void> {
        await db.userPreferences.update(
            { doNotSell: true },
            { where: { userId } }
        );

        // We don't sell data, but record the preference
        await this.audit.log({
            userId,
            action: 'CCPA_OPT_OUT',
            timestamp: new Date()
        });
    }

    // Non-Discrimination
    async verifyNonDiscrimination(userId: string): Promise<boolean> {
        // Ensure user has same access regardless of privacy choices
        const user = await db.users.findOne({ where: { id: userId } });
        const preferences = await db.userPreferences.findOne({ where: { userId } });

        // Check that privacy choices don't affect service level
        return user.serviceLevel === 'standard' &&
               !user.restricted &&
               !preferences.limitedFeatures;
    }
}
```

### Audit Logging

```typescript
class AuditLogger {
    async log(event: AuditEvent): Promise<void> {
        const enriched = {
            ...event,
            id: uuid(),
            timestamp: new Date(),
            ip: this.getClientIP(),
            userAgent: this.getUserAgent(),
            sessionId: this.getSessionId(),
            correlationId: this.getCorrelationId()
        };

        // Write to immutable audit log
        await this.writeToAuditLog(enriched);

        // Send to SIEM if configured
        if (this.siemEnabled) {
            await this.sendToSIEM(enriched);
        }

        // Check for security events
        if (this.isSecurityEvent(event)) {
            await this.handleSecurityEvent(enriched);
        }
    }

    private async writeToAuditLog(event: EnrichedAuditEvent): Promise<void> {
        // Write to append-only log
        await db.auditLogs.create({
            ...event,
            hash: this.hashEvent(event),
            previousHash: await this.getPreviousHash()
        });

        // Replicate to backup
        await this.replicateToBackup(event);
    }

    private isSecurityEvent(event: AuditEvent): boolean {
        const securityActions = [
            'LOGIN_FAILED',
            'PERMISSION_DENIED',
            'RATE_LIMIT_EXCEEDED',
            'SUSPICIOUS_ACTIVITY',
            'DATA_EXPORT',
            'DATA_DELETION',
            'PRIVILEGE_ESCALATION'
        ];

        return securityActions.includes(event.action);
    }

    private async handleSecurityEvent(event: EnrichedAuditEvent): Promise<void> {
        // Alert security team
        await this.alertSecurity(event);

        // Check for patterns
        const pattern = await this.detectPattern(event);
        if (pattern) {
            await this.respondToPattern(pattern);
        }
    }
}
```

---

## Security Operations

### Incident Response

```typescript
interface IncidentResponsePlan {
    phases: {
        detection: {
            monitoring: string[];
            alerts: AlertConfig[];
            escalation: EscalationPolicy;
        };

        containment: {
            immediate: string[]; // Immediate actions
            shortTerm: string[]; // Short-term containment
            communication: CommunicationPlan;
        };

        eradication: {
            steps: string[];
            validation: ValidationChecks[];
        };

        recovery: {
            restoration: string[];
            monitoring: string[];
            validation: string[];
        };

        lessons: {
            documentation: string[];
            improvements: string[];
            training: string[];
        };
    };

    playbooks: {
        dataBreache: IncidentPlaybook;
        ddosAttack: IncidentPlaybook;
        accountCompromise: IncidentPlaybook;
        malwareInfection: IncidentPlaybook;
        insiderThreat: IncidentPlaybook;
    };
}

class IncidentResponseManager {
    async handleIncident(
        type: IncidentType,
        severity: Severity
    ): Promise<void> {
        const incident = await this.createIncident(type, severity);

        // Execute playbook
        const playbook = this.getPlaybook(type);

        for (const phase of playbook.phases) {
            await this.executePhase(incident, phase);

            // Check if escalation needed
            if (await this.shouldEscalate(incident)) {
                await this.escalate(incident);
            }
        }

        // Post-incident review
        await this.conductReview(incident);
    }
}
```

### Security Monitoring

```typescript
class SecurityMonitor {
    async monitorSecurityEvents(): Promise<void> {
        // Failed login attempts
        this.monitorFailedLogins();

        // Unusual access patterns
        this.monitorAccessPatterns();

        // Data exfiltration attempts
        this.monitorDataExfiltration();

        // Privilege escalation
        this.monitorPrivilegeEscalation();

        // API abuse
        this.monitorAPIAbuse();
    }

    private async monitorFailedLogins(): Promise<void> {
        const threshold = 5;
        const window = 300; // 5 minutes

        const failures = await db.auditLogs.count({
            where: {
                action: 'LOGIN_FAILED',
                timestamp: {
                    gte: new Date(Date.now() - window * 1000)
                }
            },
            groupBy: ['ip']
        });

        for (const [ip, count] of failures) {
            if (count >= threshold) {
                await this.blockIP(ip, 'Excessive login failures');
                await this.alert({
                    type: 'BRUTE_FORCE_ATTEMPT',
                    ip,
                    attempts: count
                });
            }
        }
    }

    private async monitorDataExfiltration(): Promise<void> {
        const query = `
            SELECT user_id, COUNT(*) as export_count
            FROM audit_logs
            WHERE action IN ('DATA_EXPORT', 'CALENDAR_EXPORT', 'EMAIL_EXPORT')
            AND timestamp > NOW() - INTERVAL '1 hour'
            GROUP BY user_id
            HAVING COUNT(*) > 10
        `;

        const suspicious = await db.raw(query);

        for (const record of suspicious) {
            await this.alert({
                type: 'POSSIBLE_DATA_EXFILTRATION',
                userId: record.user_id,
                exportCount: record.export_count
            });

            // Temporarily restrict account
            await this.restrictAccount(record.user_id);
        }
    }
}
```

### Vulnerability Management

```typescript
class VulnerabilityManagement {
    async scanDependencies(): Promise<VulnerabilityReport> {
        const dependencies = await this.getDependencies();
        const vulnerabilities: Vulnerability[] = [];

        for (const dep of dependencies) {
            const vulns = await this.checkVulnerabilityDatabase(dep);
            vulnerabilities.push(...vulns);
        }

        // Prioritize by CVSS score
        vulnerabilities.sort((a, b) => b.cvssScore - a.cvssScore);

        return {
            critical: vulnerabilities.filter(v => v.cvssScore >= 9),
            high: vulnerabilities.filter(v => v.cvssScore >= 7 && v.cvssScore < 9),
            medium: vulnerabilities.filter(v => v.cvssScore >= 4 && v.cvssScore < 7),
            low: vulnerabilities.filter(v => v.cvssScore < 4),
            scanDate: new Date()
        };
    }

    async performSecurityAudit(): Promise<AuditReport> {
        const checks = [
            this.checkPasswordPolicy(),
            this.checkEncryption(),
            this.checkAccessControls(),
            this.checkAPISecurityHeaders(),
            this.checkDatabaseSecurity(),
            this.checkNetworkSecurity(),
            this.checkLogging(),
            this.checkBackups()
        ];

        const results = await Promise.all(checks);

        return {
            passed: results.filter(r => r.status === 'pass'),
            failed: results.filter(r => r.status === 'fail'),
            warnings: results.filter(r => r.status === 'warning'),
            score: this.calculateSecurityScore(results),
            recommendations: this.generateRecommendations(results),
            auditDate: new Date()
        };
    }
}
```

---

## Security Headers

```typescript
const securityHeaders = {
    // Prevent XSS attacks
    'X-XSS-Protection': '1; mode=block',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Content Security Policy
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://api.cams.example.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; '),

    // Strict Transport Security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy
    'Permissions-Policy': [
        'accelerometer=()',
        'camera=()',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'microphone=()',
        'payment=()',
        'usb=()'
    ].join(', ')
};
```

---

## Security Testing

### Penetration Testing Schedule

| Test Type | Frequency | Scope | Provider |
|-----------|-----------|-------|----------|
| External Pen Test | Quarterly | Public APIs, Web App | External Vendor |
| Internal Pen Test | Semi-Annual | Internal Network, Admin | Security Team |
| Red Team Exercise | Annual | Full Scope | Specialized Firm |
| Vulnerability Scanning | Weekly | All Systems | Automated |
| Code Security Review | Per Release | New Features | Security Team |

### Security Checklist

```typescript
interface SecurityChecklist {
    authentication: [
        'Password complexity enforced',
        'MFA enabled for admin accounts',
        'Session timeout configured',
        'Account lockout implemented',
        'Password history enforced'
    ];

    authorization: [
        'RBAC properly configured',
        'Least privilege principle applied',
        'Resource-level access control',
        'API permissions validated',
        'Admin functions restricted'
    ];

    dataProtection: [
        'Encryption at rest enabled',
        'TLS 1.3 enforced',
        'Sensitive data masked in logs',
        'PII properly protected',
        'Backups encrypted'
    ];

    apiSecurity: [
        'Rate limiting active',
        'Input validation comprehensive',
        'CORS properly configured',
        'Security headers present',
        'API authentication required'
    ];

    monitoring: [
        'Audit logging enabled',
        'Security alerts configured',
        'Anomaly detection active',
        'SIEM integration working',
        'Incident response plan tested'
    ];
}
```

---

*This security model provides comprehensive protection for the Calendar Availability Management System, ensuring data confidentiality, integrity, and availability while maintaining compliance with relevant regulations.*