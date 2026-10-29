import { IKYCProvider, NidDemographics, FaceMatchResult, OcrExtractionResult } from './IKYCProvider.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../errors/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';

export class PorichoyProvider implements IKYCProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private consecutiveFailures = 0;

  constructor(baseUrl: string = env.PORICHOY_BASE_URL, apiKey: string = env.PORICHOY_API_KEY) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  public resetFailureCount(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Optical Character Recognition via Porichoy OCR API.
   */
  async extractOcr(frontImage: Buffer, backImage: Buffer): Promise<OcrExtractionResult> {
    try {
      const formData = new FormData();
      formData.append('front_image', new Blob([new Uint8Array(frontImage)]), 'front.jpg');
      formData.append('back_image', new Blob([new Uint8Array(backImage)]), 'back.jpg');

      const response = await fetch(`${this.baseUrl}/api/v1/ocr/nid`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey
        },
        body: formData,
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        this.handleHttpError(response.status, 'Porichoy OCR gateway');
      }

      const json = await response.json();
      this.consecutiveFailures = 0;

      const data = json.data || json;
      const nidNumber = (data.nid_number || data.nidNumber || '').toString().trim();
      const dob = (data.dob || data.dateOfBirth || '').toString().trim();
      const extractedName = data.name || data.fullName || data.extractedName;
      const format = nidNumber.length === 10 ? 'smart_card_10' : 'legacy_nid';

      return {
        nidNumber,
        dob,
        extractedName,
        format
      };
    } catch (error: any) {
      this.consecutiveFailures++;
      logger.error(`[PorichoyProvider] OCR extraction error: ${error.message}`);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Government OCR gateway is temporarily unavailable. Please enter details manually.',
        502,
        ErrorCodes.KYC_VERIFICATION_FAILED
      );
    }
  }

  /**
   * Demographic verification via Election Commission Porichoy Gateway.
   */
  async verifyDemographics(nidNumber: string, dob: string): Promise<NidDemographics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/verifications/voter-verify`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          national_id: nidNumber.trim(),
          dob: dob.trim()
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        this.handleHttpError(response.status, 'Porichoy Demographic Verification');
      }

      const json = await response.json();
      this.consecutiveFailures = 0;

      const voter = json.voter || json.data || json;
      return {
        nidNumber: voter.national_id || voter.nidNumber || nidNumber,
        fullNameBangla: voter.name_bangla || voter.fullNameBangla || voter.name || '',
        fullNameEnglish: voter.name_english || voter.fullNameEnglish || voter.nameEn || '',
        dob: voter.dob || dob,
        photoUrl: voter.photo_url || voter.photoUrl,
        ecPhotoBase64: voter.photo || voter.ecPhotoBase64,
        fatherName: voter.father_name || voter.fatherName,
        motherName: voter.mother_name || voter.motherName,
        presentAddress: voter.present_address || voter.presentAddress,
        permanentAddress: voter.permanent_address || voter.permanentAddress
      };
    } catch (error: any) {
      this.consecutiveFailures++;
      logger.error(`[PorichoyProvider] Demographic lookup error: ${error.message}`);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Election Commission verification service returned an error. Please try again later.',
        502,
        ErrorCodes.KYC_VERIFICATION_FAILED
      );
    }
  }

  /**
   * Biometric facial match (EC Database Photo vs Live Selfie).
   */
  async matchFace(ecPhotoBase64: string, liveSelfieBase64: string): Promise<FaceMatchResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/verification/face-match`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          person_photo: ecPhotoBase64,
          selfie_photo: liveSelfieBase64
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        this.handleHttpError(response.status, 'Porichoy Biometric Match Gateway');
      }

      const json = await response.json();
      this.consecutiveFailures = 0;

      const score = Number(json.confidence_score ?? json.score ?? json.confidenceScore ?? 0);
      const isMatch = Boolean(json.is_match ?? json.matched ?? score >= 85);
      const livenessPassed = Boolean(json.liveness_passed ?? json.liveness ?? true);

      return {
        isMatch,
        confidenceScore: score,
        livenessPassed
      };
    } catch (error: any) {
      this.consecutiveFailures++;
      logger.error(`[PorichoyProvider] Face match verification error: ${error.message}`);
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Biometric verification gateway error. Please try again.',
        502,
        ErrorCodes.KYC_VERIFICATION_FAILED
      );
    }
  }

  private handleHttpError(statusCode: number, serviceName: string): void {
    this.consecutiveFailures++;
    logger.warn(`[PorichoyProvider] ${serviceName} responded with HTTP ${statusCode}`);
    if (statusCode === 404 || statusCode === 400) {
      throw new AppError(
        'National ID or Date of Birth could not be verified against official EC records.',
        400,
        ErrorCodes.KYC_VERIFICATION_FAILED
      );
    }
    if (statusCode === 401 || statusCode === 403) {
      throw new AppError('KYC service authorization rejected.', 500, ErrorCodes.INTERNAL_SERVER_ERROR);
    }
    if (statusCode === 502 || statusCode === 504 || statusCode === 503) {
      throw new AppError(
        'Government gateway is temporarily unavailable or experiencing high latency.',
        502,
        ErrorCodes.KYC_VERIFICATION_FAILED
      );
    }
    throw new AppError(`Upstream verification failed with status ${statusCode}`, 502, ErrorCodes.KYC_VERIFICATION_FAILED);
  }
}
