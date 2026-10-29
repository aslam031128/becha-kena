import { IKYCProvider, NidDemographics, FaceMatchResult, OcrExtractionResult } from './IKYCProvider.js';
import { AppError } from '../../errors/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';

export class MockProvider implements IKYCProvider {
  private customScore: number | null = null;
  private shouldFailOcr = false;
  private shouldFailDemographics = false;

  public setCustomScore(score: number | null): void {
    this.customScore = score;
  }

  public setFailOcr(fail: boolean): void {
    this.shouldFailOcr = fail;
  }

  public setFailDemographics(fail: boolean): void {
    this.shouldFailDemographics = fail;
  }

  /**
   * Mock OCR extraction.
   */
  async extractOcr(frontImage: Buffer, backImage: Buffer): Promise<OcrExtractionResult> {
    if (this.shouldFailOcr) {
      throw new AppError('OCR failed to detect clear NID card edges', 400, ErrorCodes.KYC_VERIFICATION_FAILED);
    }

    const frontStr = frontImage?.toString('utf8') || '';
    if (frontStr.includes('INVALID_OCR')) {
      throw new AppError('OCR text extraction unreadable', 400, ErrorCodes.KYC_VERIFICATION_FAILED);
    }

    // Default mock response matching api-spec.md Section 4.1
    return {
      nidNumber: '19942691234567890',
      dob: '1994-05-18',
      extractedName: 'FARHANA RAHMAN',
      format: 'smart_card_10'
    };
  }

  /**
   * Mock demographic verification against Election Commission database.
   */
  async verifyDemographics(nidNumber: string, dob: string): Promise<NidDemographics> {
    if (this.shouldFailDemographics || nidNumber.startsWith('0000000000')) {
      throw new AppError(
        'National ID or Date of Birth could not be verified against official EC records.',
        400,
        ErrorCodes.KYC_VERIFICATION_FAILED
      );
    }

    return {
      nidNumber,
      fullNameBangla: 'ফারহানা রহমান',
      fullNameEnglish: 'FARHANA RAHMAN',
      dob,
      photoUrl: 'https://cdn.becha-kena.com/kyc/mock_ec_photo.webp',
      ecPhotoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
      fatherName: 'আজিজুর রহমান',
      motherName: 'রোকেয়া বেগম',
      presentAddress: 'Road 7, Dhanmondi, Dhaka 1205',
      permanentAddress: 'Village: Uttarpara, Tangail Sadar, Tangail'
    };
  }

  /**
   * Mock biometric face match.
   */
  async matchFace(ecPhotoBase64: string, liveSelfieBase64: string): Promise<FaceMatchResult> {
    const selfieStr = (liveSelfieBase64 || '').toLowerCase();

    // Check for explicit test triggers in input
    if (selfieStr.includes('mismatch') || selfieStr.includes('fail') || selfieStr.includes('impostor')) {
      return {
        isMatch: false,
        confidenceScore: 45.2,
        livenessPassed: true
      };
    }

    if (selfieStr.includes('low_rebind') || selfieStr.includes('score_88')) {
      return {
        isMatch: true,
        confidenceScore: 88.5,
        livenessPassed: true
      };
    }

    if (selfieStr.includes('liveness_failed')) {
      return {
        isMatch: false,
        confidenceScore: 30.0,
        livenessPassed: false
      };
    }

    if (this.customScore !== null) {
      return {
        isMatch: this.customScore >= 85,
        confidenceScore: this.customScore,
        livenessPassed: true
      };
    }

    // Default successful match
    return {
      isMatch: true,
      confidenceScore: 98.2,
      livenessPassed: true
    };
  }
}
