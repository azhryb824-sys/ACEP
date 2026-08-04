export interface SpeechRecognitionResult {
    transcript: string;
    confidence: number;
    language: string;
    durationMs: number;
}
export interface VoiceCommand {
    intent: string;
    entities: Record<string, string>;
    raw: string;
    confidence: number;
}
export interface SpeechConfig {
    provider: 'openai-whisper' | 'express-api' | 'mock';
    baseUrl: string;
    apiKey?: string;
    language: string;
}
export declare class SpeechService {
    private config;
    private initialized;
    initialize(config?: Partial<SpeechConfig>): Promise<void>;
    speechToText(audioBuffer: Buffer): Promise<SpeechRecognitionResult>;
    textToSpeech(text: string): Promise<Buffer>;
    processVoiceCommand(audioBuffer: Buffer): Promise<VoiceCommand>;
    processTextCommand(text: string): Promise<VoiceCommand>;
    isInitialized(): boolean;
    private _whisperStt;
    private _apiStt;
    private _mockStt;
    private _parseCommand;
    private ensureInitialized;
}
export declare const speechService: SpeechService;
//# sourceMappingURL=index.d.ts.map