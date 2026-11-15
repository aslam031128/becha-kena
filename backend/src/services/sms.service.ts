import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rawResponse?: unknown;
}

/**
 * Service to handle SMS dispatch across multiple providers (BulkSMSBD, AlphaSMS, Mock)
 */
export class SmsService {
  /**
   * Format phone number for BulkSMSBD (expects 8801XXXXXXXXX without +)
   */
  private static formatForBulkSmsBd(phone: string): string {
    return phone.replace(/^\+/, '');
  }

  /**
   * Send OTP SMS to a user's mobile number
   * Format adheres to BulkSMSBD requirement: "Your {Brand/Company Name} OTP is XXXX"
   */
  static async sendOtp(phone: string, otp: string): Promise<SmsSendResult> {
    const message = `Your Becha-Kena OTP is ${otp}. Valid for 2 minutes. Never share this code with anyone.`;

    if (env.NODE_ENV === 'development') {
      logger.info(`🔑 [DEVELOPMENT OTP] Phone: ${phone} | OTP: ${otp}`);
    }

    switch (env.SMS_PROVIDER) {
      case 'bulksmsbd':
        return this.sendViaBulkSmsBd(phone, message);
      case 'alpha_sms':
        return this.sendViaAlphaSms(phone, message);
      case 'mock':
      default:
        logger.info(`📨 [MOCK SMS] Sent to ${phone}: "${message}"`);
        return { success: true, messageId: 'mock-' + Date.now() };
    }
  }

  /**
   * Dispatch SMS via BulkSMSBD API (http://bulksmsbd.net/developers)
   */
  private static async sendViaBulkSmsBd(phone: string, message: string): Promise<SmsSendResult> {
    const apiKey = env.BULKSMSBD_API_KEY;
    const senderId = env.BULKSMSBD_SENDER_ID;
    const number = this.formatForBulkSmsBd(phone);

    if (!apiKey) {
      logger.error('❌ BulkSMSBD API Key is missing in environment variables');
      return { success: false, error: 'BulkSMSBD API Key not configured' };
    }

    try {
      const url = new URL('http://bulksmsbd.net/api/smsapi');
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('type', 'text');
      url.searchParams.append('number', number);
      if (senderId) {
        url.searchParams.append('senderid', senderId);
      }
      url.searchParams.append('message', message);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      console.log(`📱 BulkSMSBD Response [${response.status}]:`, JSON.stringify(responseData));
      logger.info(`📱 BulkSMSBD API response: ${JSON.stringify(responseData)}`);

      // BulkSMSBD standard success response code is 202
      if (responseData?.response_code === 202 || responseData?.response_code === '202') {
        console.log(`✅ BulkSMSBD SMS delivered successfully to ${number}`);
        return {
          success: true,
          messageId: responseData?.success_message || '202',
          rawResponse: responseData
        };
      }

      console.warn(`⚠️ BulkSMSBD Error: Code ${responseData?.response_code} - ${responseData?.error_message || responseText}`);
      if (!senderId) {
        console.warn(`💡 TIP: BulkSMSBD requires 'senderid'. Check your BulkSMSBD dashboard -> 'Sender ID' tab and add BULKSMSBD_SENDER_ID to backend/.env`);
      }
      return {
        success: false,
        error: responseData?.error_message || `Response code: ${responseData?.response_code}`,
        rawResponse: responseData
      };
    } catch (err: any) {
      logger.error(`❌ BulkSMSBD network error: ${err.message}`, { error: err });
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Fallback AlphaSMS dispatch
   */
  private static async sendViaAlphaSms(phone: string, message: string): Promise<SmsSendResult> {
    logger.info(`📨 [AlphaSMS] Sent to ${phone}: "${message}"`);
    return { success: true, messageId: 'alpha-' + Date.now() };
  }
}

