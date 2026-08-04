"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.speechService = exports.SpeechService = void 0;
const axios_1 = __importDefault(require("axios"));
// ─── Arabic + English construction command patterns ───
const COMMAND_PATTERNS = [
    {
        intent: 'calculate_cost',
        patterns: [
            /(\d+)\s*(متر|m2|m²|sqm|square\s*meter)\s*(تشطيب|finish|بناء|build)/i,
            /كم\s+تكلفة\s+(\d+)\s*(متر|m2)/i,
            /cost\s+(estimate|of)\s+(\d+)\s*(sq\s*m|m2|square\s*meter)/i,
        ],
        extract: (m) => ({ area: m[1], unit: m[2] || m[3] || 'm²', type: m[4] || 'building' }),
    },
    {
        intent: 'check_progress',
        patterns: [
            /(نسبة|تقدم)\s*(الإنجاز|العمل)/i,
            /(progress|status)\s+(of|report|update)/i,
            /كم\s+وصل\s*(العمل|الشغل)/i,
        ],
        extract: () => ({}),
    },
    {
        intent: 'material_inquiry',
        patterns: [
            /(كمية|كم)\s*(خرسانة|حديد|اسمنت|بلوك|بلاط|دهان)/i,
            /(quantity|amount|volume)\s+(of\s+)?(concrete|steel|cement|block|tile|paint)/i,
        ],
        extract: (m) => ({ material: (m[2] || m[3] || '').toLowerCase() }),
    },
    {
        intent: 'schedule_inquiry',
        patterns: [
            /(الجدول|المدة|متى)\s*(التسليم|الانتهاء|البداية)/i,
            /(schedule|timeline|deadline|when)\s+(delivery|finish|start)/i,
        ],
        extract: () => ({}),
    },
    {
        intent: 'quality_report',
        patterns: [
            /(جودة|فحص|تفتيش)\s*(خرسانة|حديد|بناء|تشطيب)/i,
            /(quality|inspection|check)\s+(report|of|for)/i,
        ],
        extract: (m) => ({ area: (m[2] || '').toLowerCase() }),
    },
    {
        intent: 'risk_assessment',
        patterns: [
            /(مخاطر|تقييم)\s*(السلامة|الأمان|المشروع)/i,
            /(risk|safety)\s+(assessment|report|check)/i,
        ],
        extract: () => ({}),
    },
];
class SpeechService {
    config = { provider: 'mock', baseUrl: 'http://localhost:3000', language: 'ar' };
    initialized = false;
    async initialize(config) {
        if (config)
            this.config = { ...this.config, ...config };
        if (!this.config.baseUrl) {
            this.config.baseUrl = process.env.ACEP_ANALYSIS_URL || 'http://localhost:3000';
        }
        if (!this.config.apiKey && this.config.provider === 'openai-whisper') {
            this.config.apiKey = process.env.OPENAI_API_KEY || '';
        }
        this.initialized = true;
    }
    async speechToText(audioBuffer) {
        this.ensureInitialized();
        const t0 = Date.now();
        if (this.config.provider === 'openai-whisper')
            return this._whisperStt(audioBuffer);
        if (this.config.provider === 'express-api')
            return this._apiStt(audioBuffer);
        return this._mockStt(audioBuffer, t0);
    }
    async textToSpeech(text) {
        this.ensureInitialized();
        if (this.config.provider === 'openai-whisper') {
            try {
                const r = await axios_1.default.post('https://api.openai.com/v1/audio/speech', {
                    model: 'tts-1',
                    input: text,
                    voice: 'alloy',
                }, {
                    headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
                    responseType: 'arraybuffer',
                    timeout: 30000,
                });
                return Buffer.from(r.data);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.warn(`[Speech] TTS API failed (${msg}), returning mock audio`);
            }
        }
        return Buffer.from(`[TTS] ${text}`);
    }
    async processVoiceCommand(audioBuffer) {
        const recognition = await this.speechToText(audioBuffer);
        return this._parseCommand(recognition.transcript);
    }
    async processTextCommand(text) {
        return this._parseCommand(text);
    }
    isInitialized() { return this.initialized; }
    async _whisperStt(audio) {
        try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('model', 'whisper-1');
            form.append('file', audio, { filename: 'audio.wav', contentType: 'audio/wav' });
            form.append('language', this.config.language);
            const r = await axios_1.default.post('https://api.openai.com/v1/audio/transcriptions', form, {
                headers: { ...form.getHeaders(), Authorization: `Bearer ${this.config.apiKey}` },
                timeout: 30000,
            });
            return {
                transcript: r.data.text || '',
                confidence: 0.9,
                language: this.config.language,
                durationMs: 0,
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[Speech] Whisper API failed (${msg}), using mock`);
            return this._mockStt(audio, Date.now());
        }
    }
    async _apiStt(audio) {
        try {
            const r = await axios_1.default.post(`${this.config.baseUrl}/api/v1/analyze`, {
                description: 'Transcribe this audio from a construction site',
            }, { timeout: 30000 });
            return {
                transcript: r.data?.summary || r.data?.description || '[Transcription from API]',
                confidence: 0.7,
                language: this.config.language,
                durationMs: 0,
            };
        }
        catch {
            return this._mockStt(audio, Date.now());
        }
    }
    _mockStt(_audio, t0) {
        const mockTranscripts = [
            'احسب تكلفة 500 متر تشطيب',
            'كم تكلفة بناء 300 متر مربع',
            'أظهر تقدم العمل في المشروع',
            'كم كمية الخرسانة المطلوبة',
            'متى موعد التسليم',
            'Calculate cost for 500 sqm finishing',
            'Show project progress report',
            'What is the concrete quantity needed',
        ];
        return {
            transcript: mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)],
            confidence: 0.6,
            language: this.config.language,
            durationMs: Date.now() - t0,
        };
    }
    _parseCommand(text) {
        for (const { intent, patterns, extract } of COMMAND_PATTERNS) {
            for (const rx of patterns) {
                const m = text.match(rx);
                if (m) {
                    return { intent, entities: extract(m), raw: text, confidence: 0.8 };
                }
            }
        }
        return { intent: 'unknown', entities: {}, raw: text, confidence: 0.3 };
    }
    ensureInitialized() {
        if (!this.initialized)
            throw new Error('SpeechService not initialized. Call initialize() first.');
    }
}
exports.SpeechService = SpeechService;
exports.speechService = new SpeechService();
//# sourceMappingURL=index.js.map