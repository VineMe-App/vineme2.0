import { ValidationError } from './errorHandling';

export interface ReferralValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface ReferralFormData {
  email: string;
  phone: string;
  note: string;
  firstName?: string;
  lastName?: string;
}

export interface ReferralRateLimitInfo {
  userId: string;
  timestamp: number;
  count: number;
}

// Email validation regex - more comprehensive than basic one
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Phone validation regex - supports international formats
const PHONE_REGEX = /^[\+]?[1-9][\d\s\-\(\)]{8,}$/;

// Common disposable email domains for spam protection
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.org',
  'throwaway.email',
  'temp-mail.org',
  'yopmail.com',
  'maildrop.cc',
  'sharklasers.com',
  'guerrillamailblock.com',
];

// Suspicious patterns in notes for spam detection
const SPAM_PATTERNS = [
  /https?:\/\/[^\s]+/gi, // URLs
  /\b(?:buy|sell|cheap|free|money|cash|prize|winner|congratulations)\b/gi,
  /\b(?:click|visit|download|install)\b/gi,
  /[A-Z]{5,}/g, // Excessive caps
  /(.)\1{4,}/g, // Repeated characters
];

/**
 * Validates referral form data with comprehensive checks
 * Requirement 4.4: Validate all required fields before processing
 * Requirement 4.5: User-friendly error messages and recovery options
 */
export function validateReferralForm(
  data: ReferralFormData
): ReferralValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Validate email
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required';
  } else {
    const email = data.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Please enter a valid email address';
    } else {
      // Check for disposable email domains
      const domain = email.split('@')[1];
      if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
        warnings.email =
          'Disposable email addresses may not receive verification emails reliably';
      }

      // Check email length
      if (email.length > 254) {
        errors.email = 'Email address is too long (maximum 254 characters)';
      }
    }
  }

  // Validate phone number
  if (!data.phone || !data.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else {
    const phone = data.phone.trim();

    // Remove formatting for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    if (!PHONE_REGEX.test(cleanPhone)) {
      errors.phone = 'Please enter a valid phone number';
    } else {
      // Check phone number length
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        errors.phone = 'Phone number must be at least 10 digits';
      } else if (digitsOnly.length > 15) {
        errors.phone = 'Phone number must be no more than 15 digits';
      }
    }
  }

  // Validate optional name fields
  if (data.firstName && data.firstName.trim()) {
    const firstName = data.firstName.trim();
    if (firstName.length > 50) {
      errors.firstName = 'First name must be 50 characters or less';
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(firstName)) {
      errors.firstName = 'First name contains invalid characters';
    }
  }

  if (data.lastName && data.lastName.trim()) {
    const lastName = data.lastName.trim();
    if (lastName.length > 50) {
      errors.lastName = 'Last name must be 50 characters or less';
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(lastName)) {
      errors.lastName = 'Last name contains invalid characters';
    }
  }

  // Validate note
  if (data.note && data.note.trim()) {
    const note = data.note.trim();
    if (note.length > 500) {
      errors.note = 'Note must be 500 characters or less';
    }

    // Check for spam patterns
    const spamScore = calculateSpamScore(note);
    if (spamScore > 3) {
      errors.note =
        'Note contains suspicious content. Please provide a genuine referral reason.';
    } else if (spamScore > 1) {
      warnings.note =
        'Please ensure your note provides genuine context about the referral';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

/**
 * Calculates spam score for note content
 */
function calculateSpamScore(note: string): number {
  let score = 0;

  SPAM_PATTERNS.forEach((pattern) => {
    const matches = note.match(pattern);
    if (matches) {
      score += matches.length;
    }
  });

  return score;
}

/**
 * Validates server-side referral data with additional security checks
 * Requirement 4.4: Add server-side validation for referral data
 */
export function validateServerReferralData(
  data: ReferralFormData,
  referrerId: string,
  groupId?: string
): ReferralValidationResult {
  const clientValidation = validateReferralForm(data);

  if (!clientValidation.isValid) {
    return clientValidation;
  }

  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = { ...clientValidation.warnings };

  // Validate referrer ID
  if (!referrerId || !referrerId.trim()) {
    errors.referrerId = 'Referrer ID is required';
  } else if (!isValidUUID(referrerId)) {
    errors.referrerId = 'Invalid referrer ID format';
  }

  // Validate group ID if provided
  if (groupId && !isValidUUID(groupId)) {
    errors.groupId = 'Invalid group ID format';
  }

  // Additional server-side email validation
  const email = data.email.trim().toLowerCase();

  // Check for common typos in email domains
  const commonDomainTypos = {
    'gmail.co': 'gmail.com',
    'gmail.cm': 'gmail.com',
    'gmial.com': 'gmail.com',
    'yahoo.co': 'yahoo.com',
    'yahoo.cm': 'yahoo.com',
    'hotmail.co': 'hotmail.com',
    'hotmail.cm': 'hotmail.com',
  };

  const domain = email.split('@')[1];
  if (commonDomainTypos[domain]) {
    warnings.email = `Did you mean ${email.replace(domain, commonDomainTypos[domain])}?`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

/**
 * Rate limiting for referral submissions
 * Requirement 4.5: Add rate limiting and spam protection
 */
export class ReferralRateLimiter {
  private static instance: ReferralRateLimiter;
  private rateLimitMap = new Map<string, ReferralRateLimitInfo[]>();

  // Rate limits - TEMPORARILY INCREASED FOR TESTING
  private readonly HOURLY_LIMIT = 100; // 100 referrals per hour (was 5)
  private readonly DAILY_LIMIT = 500; // 500 referrals per day (was 20)
  private readonly WEEKLY_LIMIT = 1000; // 1000 referrals per week (was 50)

  private readonly HOUR_MS = 60 * 60 * 1000;
  private readonly DAY_MS = 24 * this.HOUR_MS;
  private readonly WEEK_MS = 7 * this.DAY_MS;

  static getInstance(): ReferralRateLimiter {
    if (!ReferralRateLimiter.instance) {
      ReferralRateLimiter.instance = new ReferralRateLimiter();
    }
    return ReferralRateLimiter.instance;
  }

  /**
   * Check if user can make a referral
   */
  canMakeReferral(userId: string): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  } {
    const now = Date.now();
    const userReferrals = this.rateLimitMap.get(userId) || [];

    // Clean up old entries
    const validReferrals = userReferrals.filter(
      (ref) => now - ref.timestamp < this.WEEK_MS
    );
    this.rateLimitMap.set(userId, validReferrals);

    // Check hourly limit
    const hourlyReferrals = validReferrals.filter(
      (ref) => now - ref.timestamp < this.HOUR_MS
    );
    if (hourlyReferrals.length >= this.HOURLY_LIMIT) {
      const oldestHourly = Math.min(
        ...hourlyReferrals.map((ref) => ref.timestamp)
      );
      const retryAfter = oldestHourly + this.HOUR_MS - now;
      return {
        allowed: false,
        reason: `Too many referrals in the last hour. You can make ${this.HOURLY_LIMIT} referrals per hour.`,
        retryAfter: Math.ceil(retryAfter / 1000 / 60), // minutes
      };
    }

    // Check daily limit
    const dailyReferrals = validReferrals.filter(
      (ref) => now - ref.timestamp < this.DAY_MS
    );
    if (dailyReferrals.length >= this.DAILY_LIMIT) {
      const oldestDaily = Math.min(
        ...dailyReferrals.map((ref) => ref.timestamp)
      );
      const retryAfter = oldestDaily + this.DAY_MS - now;
      return {
        allowed: false,
        reason: `Daily referral limit reached. You can make ${this.DAILY_LIMIT} referrals per day.`,
        retryAfter: Math.ceil(retryAfter / 1000 / 60 / 60), // hours
      };
    }

    // Check weekly limit
    if (validReferrals.length >= this.WEEKLY_LIMIT) {
      const oldestWeekly = Math.min(
        ...validReferrals.map((ref) => ref.timestamp)
      );
      const retryAfter = oldestWeekly + this.WEEK_MS - now;
      return {
        allowed: false,
        reason: `Weekly referral limit reached. You can make ${this.WEEKLY_LIMIT} referrals per week.`,
        retryAfter: Math.ceil(retryAfter / 1000 / 60 / 60 / 24), // days
      };
    }

    return { allowed: true };
  }

  /**
   * Record a referral attempt
   */
  recordReferral(userId: string): void {
    const userReferrals = this.rateLimitMap.get(userId) || [];
    userReferrals.push({
      userId,
      timestamp: Date.now(),
      count: 1,
    });
    this.rateLimitMap.set(userId, userReferrals);
  }

  /**
   * Get current rate limit status for user
   */
  getRateLimitStatus(userId: string): {
    hourlyUsed: number;
    hourlyLimit: number;
    dailyUsed: number;
    dailyLimit: number;
    weeklyUsed: number;
    weeklyLimit: number;
  } {
    const now = Date.now();
    const userReferrals = this.rateLimitMap.get(userId) || [];

    return {
      hourlyUsed: userReferrals.filter(
        (ref) => now - ref.timestamp < this.HOUR_MS
      ).length,
      hourlyLimit: this.HOURLY_LIMIT,
      dailyUsed: userReferrals.filter(
        (ref) => now - ref.timestamp < this.DAY_MS
      ).length,
      dailyLimit: this.DAILY_LIMIT,
      weeklyUsed: userReferrals.filter(
        (ref) => now - ref.timestamp < this.WEEK_MS
      ).length,
      weeklyLimit: this.WEEKLY_LIMIT,
    };
  }

  /**
   * Clear rate limit data for user (admin function)
   */
  clearUserRateLimit(userId: string): void {
    this.rateLimitMap.delete(userId);
  }

  /**
   * Clear all rate limit data (admin function)
   */
  clearAllRateLimits(): void {
    this.rateLimitMap.clear();
  }
}

/**
 * Validates UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitizes user input to prevent XSS and other attacks
 */
export function sanitizeReferralInput(
  data: ReferralFormData
): ReferralFormData {
  return {
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    note: data.note.trim().substring(0, 500), // Enforce max length
    firstName: data.firstName?.trim().substring(0, 50),
    lastName: data.lastName?.trim().substring(0, 50),
    groupId: data.groupId, // Include groupId
    referrerId: data.referrerId, // Include referrerId
  };
}

/**
 * Creates user-friendly error messages for different error types
 * Requirement 4.5: Create user-friendly error messages and recovery options
 */
export function createReferralErrorMessage(error: any): {
  title: string;
  message: string;
  actionable: boolean;
  retryable: boolean;
  suggestions?: string[];
} {
  if (error instanceof ValidationError) {
    return {
      title: 'Invalid Information',
      message: error.message,
      actionable: true,
      retryable: true,
      suggestions: [
        'Please check the highlighted fields and correct any errors',
        'Make sure the email address is valid and spelled correctly',
        'Ensure the phone number includes area code',
      ],
    };
  }

  if (
    error.message?.includes('rate limit') ||
    error.message?.includes('too many')
  ) {
    return {
      title: 'Too Many Referrals',
      message: error.message,
      actionable: true,
      retryable: true,
      suggestions: [
        'Please wait before making another referral',
        'You can check your referral history in your profile',
        'Contact support if you need to make urgent referrals',
      ],
    };
  }

  if (
    error.message?.includes('already exists') ||
    error.message?.includes('duplicate')
  ) {
    return {
      title: 'Already Referred',
      message: 'This person has already been referred to this group',
      actionable: true,
      retryable: false,
      suggestions: [
        'Check if they already have an account',
        'Try referring them to a different group',
        'Contact them directly to help with their account',
      ],
    };
  }

  if (
    error.message?.includes('network') ||
    error.message?.includes('connection')
  ) {
    return {
      title: 'Connection Problem',
      message: 'Unable to send referral due to network issues',
      actionable: true,
      retryable: true,
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Make sure you have a stable connection',
      ],
    };
  }

  if (error.message?.includes('email') && error.message?.includes('failed')) {
    return {
      title: 'Email Delivery Issue',
      message: 'The referral was created but the email may not have been sent',
      actionable: true,
      retryable: true,
      suggestions: [
        'The person can still create an account manually',
        'You can share the app with them directly',
        'Contact support if the issue persists',
      ],
    };
  }

  // Default error message
  return {
    title: 'Referral Failed',
    message: error.message || 'Something went wrong while sending the referral',
    actionable: true,
    retryable: true,
    suggestions: [
      'Please try again in a few moments',
      'Check that all information is correct',
      'Contact support if the problem continues',
    ],
  };
}

// Export singleton rate limiter instance
export const referralRateLimiter = ReferralRateLimiter.getInstance();
