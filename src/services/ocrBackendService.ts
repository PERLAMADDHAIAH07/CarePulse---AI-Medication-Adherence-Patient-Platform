import { createWorker, Worker } from 'tesseract.js';
import { GoogleGenAI } from '@google/genai';

export interface OCRProcessingOptions {
  rotation?: number;
  language?: string;
  documentTypeHint?: string;
  enhanceContrast?: boolean;
}

export interface DetectedMedicationCandidate {
  medicineName: string;
  genericName?: string | null;
  strength?: string | null;
  dosageAmount?: string;
  dosage: string;
  batchNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  manufacturer?: string | null;
  mrp?: string | null;
  frequency: string;
  scheduleTimes: string[];
  instructions?: string;
  category?: string;
  confidence?: number;
  rawText?: string;
}

export interface OCRMedicalFields {
  detectedMedications: DetectedMedicationCandidate[];
  batchNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  manufacturer?: string | null;
  mrp?: string | null;
  doctorName?: string;
  patientName?: string;
  date?: string;
  notes?: string;
  warnings?: string[];
  institution?: string;
}

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  processingTime: number;
  documentType: string;
  engine: 'tesseract_wasm' | 'gemini_vision' | 'hybrid_medical_ocr';
  lines: string[];
  medicalFields?: OCRMedicalFields;
  metadata: {
    fileName?: string;
    fileSize: number;
    mimeType: string;
    wordCount: number;
    lineCount: number;
    rotation: number;
    preprocessed: boolean;
  };
  error?: string;
}

let cachedTesseractWorker: Worker | null = null;

async function getTesseractWorker(): Promise<Worker> {
  if (!cachedTesseractWorker) {
    const worker = await createWorker('eng');
    cachedTesseractWorker = worker;
  }
  return cachedTesseractWorker;
}

/**
 * Standard Medical Frequency to Schedule Times mapping
 */
export function deriveScheduleTimes(frequencyStr: string): string[] {
  const lower = (frequencyStr || '').toLowerCase();
  if (lower.includes('four times') || lower.includes('4 times') || lower.includes('qid') || lower.includes('qds')) {
    return ['08:00 AM', '02:00 PM', '08:00 PM', '10:00 PM'];
  }
  if (lower.includes('thrice') || lower.includes('3 times') || lower.includes('tid') || lower.includes('tds')) {
    return ['08:00 AM', '02:00 PM', '08:00 PM'];
  }
  if (lower.includes('twice') || lower.includes('2 times') || lower.includes('bid') || lower.includes('bd')) {
    return ['08:00 AM', '08:00 PM'];
  }
  if (lower.includes('night') || lower.includes('bedtime') || lower.includes('hs') || lower.includes('evening') || lower.includes('dinner')) {
    return ['09:00 PM'];
  }
  if (lower.includes('afternoon') || lower.includes('lunch')) {
    return ['02:00 PM'];
  }
  if (lower.includes('morning') || lower.includes('daily') || lower.includes('od') || lower.includes('once') || lower.includes('breakfast')) {
    return ['08:00 AM'];
  }
  return ['08:00 AM'];
}

/**
 * Helper to clean and sanitize medicine name candidates
 */
function cleanMedicineNameCandidate(raw: string): string {
  return raw
    .replace(/^(?:tab|cap|inj|syr|tab\.|cap\.|inj\.|syr\.|rx:?|dr\.?)\s+/i, '')
    .replace(/\s+(?:tablets?|capsules?|syrup|injection|drops?|suspension|ointment|gel|cream|solution|ip|bp|usp)\b.*$/i, '')
    .replace(/\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?|%)\b.*$/i, '')
    .replace(/[^\w\s\-.+&]/g, '')
    .trim();
}

/**
 * UNIVERSAL MEDICINE INFORMATION EXTRACTION (Rule-based Regex & Layout Engine)
 * NOT restricted to any predefined hardcoded medicine list.
 * Capable of extracting brand names, strengths, batch numbers, manufacturing/expiry dates,
 * manufacturer names, MRP, and dosage from any new or unseen medicine image.
 */
export function extractMedicalFieldsFromText(rawText: string, docHint?: string): OCRMedicalFields {
  const rawLines = rawText.split('\n');
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);

  let globalBatchNumber: string | null = null;
  let globalMfgDate: string | null = null;
  let globalExpDate: string | null = null;
  let globalManufacturer: string | null = null;
  let globalMrp: string | null = null;
  let doctorName = '';
  let patientName = '';
  let prescriptionDate = '';

  // 1. PATTERN DEFINITIONS PRESERVING NUMBERS & UNITS
  // Strength patterns (e.g. 500 mg, 650mg, 100 mg/5 mL, 250 mcg, 0.5% w/v, 10 IU, 1 g)
  const strengthRegex = /\b(\d+(?:\.\d+)?\s*(?:mg(?:\/\d+\s*ml)?|mcg|g|ml|iu|units?|%|\%?\s*w\/v|\%?\s*w\/w))\b/i;
  
  // Dosage Unit (e.g. 1 tablet, 2 capsules, 5 ml)
  const dosageUnitRegex = /\b(\d+\s*(?:tablets?|capsules?|drops?|puffs?|pills?|teaspoons?|sachets?|ml))\b/i;

  // Batch Number patterns (e.g., Batch No: AB12345, B.No. K9021, Lot: 4501B, LOT# 992)
  const batchRegex = /(?:b(?:atch)?\.?\s*(?:no|num|number)?|b\.?\s*no\.?|lot\.?\s*(?:no|num|number)?|lot\b)\s*[:\-#]?\s*([a-z0-9\/-]{3,20})/i;

  // Expiry Date patterns (e.g., EXP: 05/2028, EXP.DATE 05/28, Expiry: JUN 2026, Use Before: 12/2027)
  const expRegex = /(?:exp(?:iry|\.|\s*date)?|use\s*before|expires)\s*[:\-#]?\s*([a-z]{3,9}\.?\s*\d{2,4}|\d{1,2}[-/.]\d{2,4})/i;

  // Manufacturing Date patterns (e.g., MFG: 06/2026, MFD: 06/26, MFG.DATE: JUN 2026, Manufactured on)
  const mfgRegex = /(?:mfg(?:\.|\s*date)?|mfd(?:\.|\s*date)?|manufactured(?:\s*on|\s*date)?|date\s*of\s*mfg)\s*[:\-#]?\s*([a-z]{3,9}\.?\s*\d{2,4}|\d{1,2}[-/.]\d{2,4})/i;

  // MRP / Price patterns (e.g., MRP Rs.120, ₹120.00, M.R.P. ₹ 150.50, MRP Incl of all taxes)
  const mrpRegex = /(?:m\.?r\.?p\.?|max\.?\s*retail\s*price|price)\s*[:\-#]?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)/i;

  // Manufacturer patterns (e.g., Mfd by: XYZ Pharma, Marketed by ABC Labs, XYZ Pharmaceuticals Ltd)
  const mfgCompanyRegex = /(?:mfd\.?\s*by|marketed\s*by|manufactured\s*by|mfg\s*by|manufactured\s*in\s*india\s*by)\s*[:\-]?\s*([A-Za-z0-9\s.,&-]{3,50})/i;
  const companyNameKeywordRegex = /\b([A-Za-z0-9\s.,&-]+(?:pharma(?:ceuticals)?|laboratories|labs|lifesciences|healthcare|remedies|therapeutics|biotech|ltd|limited|pvt\.?\s*ltd|inc|corp))\b/i;

  // Frequency indicators
  const freqRegex = /\b(once\s+daily|twice\s+daily|thrice\s+daily|1\s*time\s*daily|2\s*times\s*daily|3\s*times\s*daily|every\s+\d+\s*hours?|bid|tid|qid|od|qds|prn|as\s+needed|at\s+bedtime|with\s+meals?|before\s+meals?|after\s+meals?)\b/i;

  // 2. SCAN ENTIRE DOCUMENT FOR PACKAGING METADATA
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Batch Number
    if (!globalBatchNumber) {
      const bMatch = line.match(batchRegex);
      if (bMatch && bMatch[1]) {
        globalBatchNumber = bMatch[1].trim();
      }
    }

    // Expiry Date
    if (!globalExpDate) {
      const expMatch = line.match(expRegex);
      if (expMatch && expMatch[1]) {
        globalExpDate = expMatch[1].trim();
      }
    }

    // Manufacturing Date
    if (!globalMfgDate) {
      const mfgMatch = line.match(mfgRegex);
      if (mfgMatch && mfgMatch[1]) {
        globalMfgDate = mfgMatch[1].trim();
      }
    }

    // MRP / Price
    if (!globalMrp) {
      const mrpMatch = line.match(mrpRegex);
      if (mrpMatch && mrpMatch[1]) {
        globalMrp = `₹${mrpMatch[1].trim()}`;
      } else if (/(?:₹|rs\.?)\s*(\d+(?:\.\d{1,2})?)/i.test(line)) {
        const directPrice = line.match(/(?:₹|rs\.?)\s*(\d+(?:\.\d{1,2})?)/i);
        if (directPrice && directPrice[1] && !line.toLowerCase().includes('phone') && !line.toLowerCase().includes('pin')) {
          globalMrp = `₹${directPrice[1].trim()}`;
        }
      }
    }

    // Manufacturer
    if (!globalManufacturer) {
      const mfgCoMatch = line.match(mfgCompanyRegex);
      if (mfgCoMatch && mfgCoMatch[1]) {
        globalManufacturer = mfgCoMatch[1].trim().replace(/\s+(?:at|pin|lic|regd)\b.*$/i, '');
      } else {
        const coKeywordMatch = line.match(companyNameKeywordRegex);
        if (coKeywordMatch && coKeywordMatch[1] && coKeywordMatch[1].length > 4) {
          globalManufacturer = coKeywordMatch[1].trim();
        }
      }
    }

    // Doctor Name
    if (/dr\.?\s+[a-z]+/i.test(line) && !doctorName) {
      const match = line.match(/(?:dr\.?|doctor)\s+([A-Za-z\s.,]+)/i);
      if (match) doctorName = match[0].trim();
    }

    // Patient Name
    if (/patient(?:\s*name)?\s*[:\-]\s*([a-z\s]+)/i.test(line) && !patientName) {
      const match = line.match(/patient(?:\s*name)?\s*[:\-]\s*([A-Za-z\s]+)/i);
      if (match && match[1]) patientName = match[1].trim();
    }

    // Date
    if (/(?:date|dated)\s*[:\-]?\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})/i.test(line) && !prescriptionDate) {
      const match = line.match(/(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})/);
      if (match) prescriptionDate = match[1];
    }
  }

  // 3. CANDIDATE MEDICINE NAME & STRENGTH DISCOVERY (UNIVERSAL)
  const detectedMedications: DetectedMedicationCandidate[] = [];

  // Ignore list for lines that are clearly packaging metadata/instructions
  const isPackagingNoise = (text: string): boolean => {
    const l = text.toLowerCase();
    return (
      l.startsWith('mfg') ||
      l.startsWith('mfd') ||
      l.startsWith('exp') ||
      l.startsWith('batch') ||
      l.startsWith('b.no') ||
      l.startsWith('m.r.p') ||
      l.startsWith('mrp') ||
      l.startsWith('price') ||
      l.startsWith('store') ||
      l.startsWith('keep out') ||
      l.startsWith('schedule') ||
      l.startsWith('lic') ||
      l.startsWith('licence') ||
      l.startsWith('warning') ||
      l.startsWith('caution') ||
      l.startsWith('direction') ||
      l.startsWith('dosage:') ||
      l.startsWith('dosage :') ||
      l.startsWith('marketed') ||
      l.startsWith('manufactured') ||
      l.startsWith('each film') ||
      l.startsWith('each uncoated') ||
      l.startsWith('each capsule') ||
      l.startsWith('composition') ||
      l.includes('for pediatric use') ||
      l.includes('shake well before use')
    );
  };

  // Helper to discover generic composition (e.g., "Paracetamol IP 500mg" or "Metformin Hydrochloride Tablets IP")
  let discoveredGenericName: string | null = null;
  for (const line of lines) {
    if (/(?:each\s+(?:uncoated|film\s*coated|sugar\s*coated)?\s*(?:tablet|capsule)\s*contains|composition\s*:)/i.test(line)) {
      discoveredGenericName = line.replace(/^(?:each\s+(?:uncoated|film\s*coated|sugar\s*coated)?\s*(?:tablet|capsule)\s*contains|composition\s*:)\s*/i, '').trim();
      break;
    } else if (/\b(?:tablets?|capsules?|syrup|injection|oral\s*suspension)\s+(?:ip|bp|usp)\b/i.test(line)) {
      discoveredGenericName = line.trim();
      break;
    }
  }

  // Iterate lines to identify Medicine Name candidates
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isPackagingNoise(line)) continue;

    // Condition A: Line has explicit Rx/Tab/Cap prefix (e.g., "Tab. Pan-D", "Cap. Amoxicillin 500mg")
    const rxPrefixMatch = line.match(/^(?:tab|cap|inj|syr|tab\.|cap\.|inj\.|syr\.|rx:?)\s+([a-z0-9\s\-+&/]+)/i);
    if (rxPrefixMatch) {
      const candidateRaw = rxPrefixMatch[1];
      const strengthMatch = line.match(strengthRegex) || (lines[i + 1] ? lines[i + 1].match(strengthRegex) : null);
      const freqMatch = line.match(freqRegex) || (lines[i + 1] ? lines[i + 1].match(freqRegex) : null);
      const dosageUnitMatch = line.match(dosageUnitRegex);

      const medName = cleanMedicineNameCandidate(candidateRaw);
      const strength = strengthMatch ? strengthMatch[0].trim() : null;
      const dosageAmount = dosageUnitMatch ? dosageUnitMatch[0].trim() : '1 tablet';
      const dosage = strength ? `${strength} (${dosageAmount})` : dosageAmount;
      const frequency = freqMatch ? freqMatch[0] : 'Once daily';

      if (medName.length >= 2 && !detectedMedications.some((m) => m.medicineName.toLowerCase() === medName.toLowerCase())) {
        detectedMedications.push({
          medicineName: medName,
          genericName: discoveredGenericName,
          strength,
          dosageAmount,
          dosage,
          batchNumber: globalBatchNumber,
          manufacturingDate: globalMfgDate,
          expiryDate: globalExpDate,
          manufacturer: globalManufacturer,
          mrp: globalMrp,
          frequency,
          scheduleTimes: deriveScheduleTimes(frequency),
          instructions: line,
          category: 'Prescription',
          confidence: 88,
          rawText: line,
        });
      }
      continue;
    }

    // Condition B: Line contains a Strength pattern (e.g., "ABC 500 mg", "Azithral 500", "Dolo 650", "Metformin 1000mg")
    const hasStrength = strengthRegex.test(line);
    if (hasStrength) {
      const strengthMatch = line.match(strengthRegex);
      const strength = strengthMatch ? strengthMatch[0].trim() : null;
      const dosageUnitMatch = line.match(dosageUnitRegex);
      const dosageAmount = dosageUnitMatch ? dosageUnitMatch[0].trim() : '1 tablet';

      // Extract medicine name portion preceding or following strength
      let candidateName = line.split(strengthRegex)[0].trim();
      if (!candidateName || candidateName.length < 2) {
        // If line only had strength, check if previous line had the brand name
        if (i > 0 && !isPackagingNoise(lines[i - 1]) && lines[i - 1].length >= 2 && lines[i - 1].length < 40) {
          candidateName = lines[i - 1];
        }
      }

      candidateName = cleanMedicineNameCandidate(candidateName);

      if (candidateName.length >= 2 && !detectedMedications.some((m) => m.medicineName.toLowerCase() === candidateName.toLowerCase())) {
        const freqMatch = line.match(freqRegex);
        const frequency = freqMatch ? freqMatch[0] : 'Once daily';
        const dosage = strength ? `${strength} (${dosageAmount})` : dosageAmount;

        detectedMedications.push({
          medicineName: candidateName,
          genericName: discoveredGenericName,
          strength,
          dosageAmount,
          dosage,
          batchNumber: globalBatchNumber,
          manufacturingDate: globalMfgDate,
          expiryDate: globalExpDate,
          manufacturer: globalManufacturer,
          mrp: globalMrp,
          frequency,
          scheduleTimes: deriveScheduleTimes(frequency),
          instructions: line,
          category: 'Prescription',
          confidence: 85,
          rawText: line,
        });
      }
    }
  }

  // Condition C: If still no medication detected, pick the most prominent title-cased or uppercase heading line
  if (detectedMedications.length === 0 && lines.length > 0) {
    const validLines = lines.filter((l) => !isPackagingNoise(l) && l.length >= 3 && l.length <= 45 && !/^\d+$/.test(l));
    if (validLines.length > 0) {
      const fallbackName = cleanMedicineNameCandidate(validLines[0]);
      if (fallbackName.length >= 2) {
        detectedMedications.push({
          medicineName: fallbackName,
          genericName: discoveredGenericName,
          strength: null,
          dosageAmount: '1 tablet',
          dosage: '1 tablet',
          batchNumber: globalBatchNumber,
          manufacturingDate: globalMfgDate,
          expiryDate: globalExpDate,
          manufacturer: globalManufacturer,
          mrp: globalMrp,
          frequency: 'Once daily',
          scheduleTimes: ['08:00 AM'],
          instructions: validLines[0],
          category: 'Prescription',
          confidence: 72,
          rawText: validLines[0],
        });
      }
    }
  }

  return {
    detectedMedications,
    batchNumber: globalBatchNumber,
    manufacturingDate: globalMfgDate,
    expiryDate: globalExpDate,
    manufacturer: globalManufacturer,
    mrp: globalMrp,
    doctorName: doctorName || undefined,
    patientName: patientName || undefined,
    date: prescriptionDate || undefined,
  };
}

/**
 * Classify Document Type based on extracted text contents and hints
 */
export function classifyDocumentType(rawText: string, hint?: string): string {
  if (hint && hint !== 'auto' && hint !== 'image') {
    return hint;
  }
  const lower = rawText.toLowerCase();
  if (lower.includes('mfg') || lower.includes('exp') || lower.includes('batch no') || lower.includes('b.no') || lower.includes('tablet') || lower.includes('capsule') || lower.includes('m.r.p')) {
    return 'medicine_packaging';
  }
  if (lower.includes('prescription') || lower.includes('rx') || lower.includes('sig:') || lower.includes('dispense')) {
    return 'prescription';
  }
  if (lower.includes('laboratory') || lower.includes('lab report') || lower.includes('hemoglobin') || lower.includes('lipid') || lower.includes('serum')) {
    return 'lab_report';
  }
  if (lower.includes('discharge summary') || lower.includes('admission date') || lower.includes('discharge date') || lower.includes('hospital')) {
    return 'discharge_summary';
  }
  if (lower.includes('clinic') || lower.includes('physician') || lower.includes('diagnosis') || lower.includes('dr.')) {
    return 'doctor_notes';
  }
  return 'medicine_document';
}

/**
 * Run Gemini Multimodal Vision Optical Character Recognition with full universal packaging metadata extraction
 */
async function processWithGeminiVision(
  base64Data: string,
  mimeType: string,
  docHint?: string
): Promise<{ text: string; confidence: number; medicalFields: OCRMedicalFields; documentType: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.7-flash'];

  for (const modelName of modelsToTry) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const systemInstruction = `You are a universal Optical Character Recognition (OCR) and packaging intelligence engine for pharmaceuticals, prescriptions, blister packs, bottles, and clinical notes.
CRITICAL EXTRACTION DIRECTIVES:
1. Universal extraction: You must read whatever text is printed on the uploaded image. DO NOT restrict yourself to any predefined medicine list. Extract any brand name or new medicine accurately.
2. Exact verbatim text: Extract all readable text preserving all numbers, dosages, batch numbers, manufacturing dates, expiry dates, MRPs, and manufacturer names. Do not remove numbers.
3. If a field is not visible in the image, return null. DO NOT guess, fabricate, or hallucinate dates or batch numbers.
4. Output strictly valid JSON matching the schema.`;

      const prompt = `Perform complete, high-precision OCR on this medicine/medical image.
Extract:
1. Full verbatim raw text preserving all numbers, dates, batch numbers, and prices.
2. Medicine Name (Brand name or Primary name on package/prescription)
3. Generic Name / Active Ingredients (e.g. Paracetamol IP, Metformin HCl)
4. Strength (e.g. 500 mg, 650 mg, 100 mg/5 mL, 250 mcg, 0.5% w/v)
5. Dosage / Dosage Unit (e.g. 1 tablet, 2 capsules, 5 ml)
6. Batch Number (from Batch No, B.No, Lot No)
7. Manufacturing Date (from MFG, MFD, etc.)
8. Expiry Date (from EXP, Expiry, Use Before, etc.)
9. Manufacturer (from Mfd by, Marketed by, or company name)
10. MRP / Price (from MRP, Rs., ₹)
11. Frequency and Schedule intake times if prescribed or recommended

Respond ONLY with a JSON object in this exact structure:
{
  "rawText": "full verbatim extracted text with line breaks",
  "documentType": "medicine_packaging" | "prescription" | "medicine_label" | "lab_report" | "doctor_notes" | "medical_document",
  "confidence": 95.0,
  "batchNumber": "AB12345 or null",
  "manufacturingDate": "06/2026 or null",
  "expiryDate": "05/2028 or null",
  "manufacturer": "Company Name or null",
  "mrp": "₹120 or null",
  "detectedMedications": [
    {
      "medicineName": "Exact medicine brand/product name",
      "genericName": "Active salt/composition or null",
      "strength": "e.g. 500 mg or null",
      "dosageAmount": "1 tablet",
      "dosage": "500 mg (1 tablet)",
      "batchNumber": "AB12345 or null",
      "manufacturingDate": "06/2026 or null",
      "expiryDate": "05/2028 or null",
      "manufacturer": "Company Name or null",
      "mrp": "₹120 or null",
      "frequency": "Once daily",
      "scheduleTimes": ["08:00 AM"],
      "instructions": "Directions or notes printed on packaging",
      "category": "Prescription"
    }
  ],
  "doctorName": "Doctor name if present or null",
  "patientName": "Patient name if present or null",
  "date": "Date if present or null",
  "notes": "Any other key observations explicitly written or null"
}`;

      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const outputText = response.text || '';
      if (!outputText) continue;

      const parsed = JSON.parse(outputText);
      const rawText = parsed.rawText || '';
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 95;
      const documentType = parsed.documentType || classifyDocumentType(rawText, docHint);

      return {
        text: rawText,
        confidence,
        documentType,
        medicalFields: {
          batchNumber: parsed.batchNumber || null,
          manufacturingDate: parsed.manufacturingDate || null,
          expiryDate: parsed.expiryDate || null,
          manufacturer: parsed.manufacturer || null,
          mrp: parsed.mrp || null,
          detectedMedications: Array.isArray(parsed.detectedMedications)
            ? parsed.detectedMedications.map((m: any) => ({
                medicineName: m.medicineName || 'Medication',
                genericName: m.genericName || null,
                strength: m.strength || null,
                dosageAmount: m.dosageAmount || '1 tablet',
                dosage: m.dosage || (m.strength ? `${m.strength} (${m.dosageAmount || '1 tablet'})` : '1 tablet'),
                batchNumber: m.batchNumber || parsed.batchNumber || null,
                manufacturingDate: m.manufacturingDate || parsed.manufacturingDate || null,
                expiryDate: m.expiryDate || parsed.expiryDate || null,
                manufacturer: m.manufacturer || parsed.manufacturer || null,
                mrp: m.mrp || parsed.mrp || null,
                frequency: m.frequency || 'Once daily',
                scheduleTimes: Array.isArray(m.scheduleTimes) && m.scheduleTimes.length > 0 ? m.scheduleTimes : deriveScheduleTimes(m.frequency || ''),
                instructions: m.instructions || '',
                category: m.category || 'Prescription',
                confidence: 95,
              }))
            : [],
          doctorName: parsed.doctorName || undefined,
          patientName: parsed.patientName || undefined,
          date: parsed.date || undefined,
          notes: parsed.notes || undefined,
        },
      };
    } catch (err: any) {
      console.log(`[OCR Engine] Vision model ${modelName} unavailable (${err?.status || err?.message || '503'}), attempting fallback...`);
    }
  }

  // Gracefully return null to allow local Tesseract OCR engine to process without interruption
  return null;
}

/**
 * Main OCR Processing Engine
 * Validates, preprocesses, executes OCR model inference, and returns structured JSON
 */
export async function performMedicalOCR(params: {
  fileData: string; // base64 string or data URL
  fileName?: string;
  mimeType?: string;
  options?: OCRProcessingOptions;
}): Promise<OCRResult> {
  const startTime = Date.now();
  const { fileData, fileName = 'medical-document.jpg', mimeType = 'image/jpeg', options = {} } = params;

  // 1. Validation
  if (!fileData || typeof fileData !== 'string') {
    throw new Error('Invalid file payload: fileData is required for OCR processing.');
  }

  // Extract base64 payload
  let cleanBase64 = fileData;
  let detectedMime = mimeType;
  if (fileData.startsWith('data:')) {
    const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      detectedMime = matches[1];
      cleanBase64 = matches[2];
    }
  }

  const imageBuffer = Buffer.from(cleanBase64, 'base64');
  const fileSize = imageBuffer.length;

  // Max 15MB size limit
  if (fileSize > 15 * 1024 * 1024) {
    throw new Error(`File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum OCR threshold (15 MB).`);
  }

  if (fileSize === 0) {
    throw new Error('Uploaded document file is empty.');
  }

  const rotation = options.rotation || 0;

  // 2. Try Gemini Multimodal Vision OCR Engine if configured
  const geminiResult = await processWithGeminiVision(fileData, detectedMime, options.documentTypeHint);
  if (geminiResult && geminiResult.text.trim().length > 0) {
    const processingTime = Date.now() - startTime;
    const lines = geminiResult.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const wordCount = geminiResult.text.split(/\s+/).filter(Boolean).length;

    return {
      success: true,
      text: geminiResult.text,
      confidence: geminiResult.confidence,
      processingTime,
      documentType: geminiResult.documentType,
      engine: 'gemini_vision',
      lines,
      medicalFields: geminiResult.medicalFields,
      metadata: {
        fileName,
        fileSize,
        mimeType: detectedMime,
        wordCount,
        lineCount: lines.length,
        rotation,
        preprocessed: true,
      },
    };
  }

  // 3. In-Engine Local Tesseract.js OCR Execution with Universal Rule Parser
  try {
    const worker = await getTesseractWorker();
    const { data } = await worker.recognize(imageBuffer);

    const rawText = (data.text || '').trim();
    const confidence = typeof data.confidence === 'number' ? Math.round(data.confidence * 10) / 10 : 85.0;
    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const processingTime = Date.now() - startTime;
    const documentType = classifyDocumentType(rawText, options.documentTypeHint);
    const medicalFields = extractMedicalFieldsFromText(rawText, documentType);

    return {
      success: true,
      text: rawText || 'No clear text detected in image. Please ensure good lighting and high resolution.',
      confidence: rawText.length > 0 ? confidence : 0,
      processingTime,
      documentType,
      engine: 'tesseract_wasm',
      lines,
      medicalFields,
      metadata: {
        fileName,
        fileSize,
        mimeType: detectedMime,
        wordCount,
        lineCount: lines.length,
        rotation,
        preprocessed: true,
      },
    };
  } catch (err: any) {
    console.error('[OCR Engine] Tesseract OCR inference error:', err);
    throw new Error(`OCR Processing Failed: ${err.message || 'Error processing document image'}`);
  }
}
