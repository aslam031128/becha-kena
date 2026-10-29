import { IKYCProvider, NidDemographics, FaceMatchResult, OcrExtractionResult } from './IKYCProvider.js';
import { PorichoyProvider } from './PorichoyProvider.js';
import { MockProvider } from './MockProvider.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class KYCProviderFactory implements IKYCProvider {
  private static instance: KYCProviderFactory | null = null;
  private primaryProvider: IKYCProvider;
  private fallbackProvider: IKYCProvider;
  private mockProvider: MockProvider;
  private currentProviderType: string;

  constructor() {
    this.mockProvider = new MockProvider();
    this.fallbackProvider = this.mockProvider;
    this.currentProviderType = env.KYC_PROVIDER;

    if (env.KYC_PROVIDER === 'porichoy') {
      this.primaryProvider = new PorichoyProvider();
    } else {
      this.primaryProvider = this.mockProvider;
    }
  }

  public static getInstance(): KYCProviderFactory {
    if (!KYCProviderFactory.instance) {
      KYCProviderFactory.instance = new KYCProviderFactory();
    }
    return KYCProviderFactory.instance;
  }

  public getMockProvider(): MockProvider {
    return this.mockProvider;
  }

  public setProvider(provider: IKYCProvider): void {
    this.primaryProvider = provider;
  }

  public reset(): void {
    this.mockProvider = new MockProvider();
    this.currentProviderType = env.KYC_PROVIDER;
    if (env.KYC_PROVIDER === 'porichoy') {
      this.primaryProvider = new PorichoyProvider();
    } else {
      this.primaryProvider = this.mockProvider;
    }
  }

  async extractOcr(frontImage: Buffer, backImage: Buffer): Promise<OcrExtractionResult> {
    try {
      return await this.primaryProvider.extractOcr(frontImage, backImage);
    } catch (error: any) {
      if (this.currentProviderType === 'porichoy') {
        logger.warn('⚠️ Primary KYC OCR provider failed. Engaging fallback provider...');
        return await this.fallbackProvider.extractOcr(frontImage, backImage);
      }
      throw error;
    }
  }

  async verifyDemographics(nidNumber: string, dob: string): Promise<NidDemographics> {
    try {
      return await this.primaryProvider.verifyDemographics(nidNumber, dob);
    } catch (error: any) {
      if (this.currentProviderType === 'porichoy') {
        logger.warn('⚠️ Primary KYC demographic check failed. Engaging fallback provider...');
        return await this.fallbackProvider.verifyDemographics(nidNumber, dob);
      }
      throw error;
    }
  }

  async matchFace(ecPhotoBase64: string, liveSelfieBase64: string): Promise<FaceMatchResult> {
    try {
      return await this.primaryProvider.matchFace(ecPhotoBase64, liveSelfieBase64);
    } catch (error: any) {
      if (this.currentProviderType === 'porichoy') {
        logger.warn('⚠️ Primary KYC face match failed. Engaging fallback provider...');
        return await this.fallbackProvider.matchFace(ecPhotoBase64, liveSelfieBase64);
      }
      throw error;
    }
  }
}

export const kycService = KYCProviderFactory.getInstance();
