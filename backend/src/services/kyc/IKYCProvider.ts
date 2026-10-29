export interface NidDemographics {
  nidNumber: string;
  fullNameBangla: string;
  fullNameEnglish: string;
  dob: string;
  photoUrl?: string;
  ecPhotoBase64?: string;
  fatherName?: string;
  motherName?: string;
  presentAddress?: string;
  permanentAddress?: string;
}

export interface FaceMatchResult {
  isMatch: boolean;
  confidenceScore: number; // 0 to 100%
  livenessPassed: boolean;
}

export interface OcrExtractionResult {
  nidNumber: string;
  dob: string;
  extractedName?: string;
  format?: string;
}

export interface IKYCProvider {
  extractOcr(frontImage: Buffer, backImage: Buffer): Promise<OcrExtractionResult>;
  verifyDemographics(nidNumber: string, dob: string): Promise<NidDemographics>;
  matchFace(ecPhotoBase64: string, liveSelfieBase64: string): Promise<FaceMatchResult>;
}
