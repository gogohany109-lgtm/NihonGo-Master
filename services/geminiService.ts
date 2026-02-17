import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, PronunciationResult, DictionaryEntry } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateTextToJapanese = async (
  text: string,
  sourceLanguage: string
): Promise<TranslationResult> => {
  const ai = getAIClient();
  try {
    const prompt = `
      Translate to Japanese: "${text}" from ${sourceLanguage}.
      Return JSON with: japanese, romaji, pronunciation, englishMeaning, tone (Casual, Polite, Formal/Keigo), breakdown (word, romaji, meaning, partOfSpeech, exampleSentence).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            japanese: { type: Type.STRING },
            romaji: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
            englishMeaning: { type: Type.STRING },
            tone: { type: Type.STRING, enum: ["Casual", "Polite", "Formal/Keigo"] },
            culturalNote: { type: Type.STRING },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  romaji: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  exampleSentence: { type: Type.STRING }
                },
                required: ["word", "romaji", "meaning", "partOfSpeech", "exampleSentence"]
              }
            }
          },
          required: ["japanese", "romaji", "pronunciation", "englishMeaning", "tone", "breakdown"]
        }
      }
    });

    if (response.text) return JSON.parse(response.text);
    throw new Error("Empty response");
  } catch (error: any) {
    console.error("Translation error:", error);
    throw new Error(error.message || "Unknown error");
  }
};

export const searchDictionary = async (query: string): Promise<DictionaryEntry> => {
  const ai = getAIClient();
  try {
    const prompt = `Dictionary entry for: "${query}". Return JSON.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            reading: { type: Type.STRING },
            romaji: { type: Type.STRING },
            meanings: { type: Type.ARRAY, items: { type: Type.STRING } },
            partOfSpeech: { type: Type.STRING },
            jlptLevel: { type: Type.STRING },
            usageNotes: { type: Type.STRING },
            kanjiBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  character: { type: Type.STRING },
                  onyomi: { type: Type.STRING },
                  kunyomi: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                }
              }
            },
            exampleSentences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { ja: { type: Type.STRING }, en: { type: Type.STRING } }
              }
            }
          },
          required: ["word", "reading", "romaji", "meanings", "partOfSpeech", "exampleSentences"]
        }
      }
    });
    if (response.text) return JSON.parse(response.text);
    throw new Error("Not found");
  } catch (error: any) {
    throw new Error(error.message || "Dictionary error");
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: "Transcribe audio." }] }]
    });
    return response.text?.trim() || "";
  } catch (error: any) {
    throw new Error(error.message || "Transcription error");
  }
};

export const evaluatePronunciation = async (base64Audio: string, mimeType: string, referenceText: string): Promise<PronunciationResult> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: `Evaluate Japanese: "${referenceText}".` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { score: { type: Type.INTEGER }, transcript: { type: Type.STRING }, feedback: { type: Type.STRING } },
          required: ["score", "transcript", "feedback"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    throw new Error(error.message || "Evaluation error");
  }
};

export const playJapaneseAudio = async (text: string, speed: number = 1.0): Promise<void> => {
  const cleanText = text?.trim();
  if (!cleanText) return;
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ["AUDIO"] as any,
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }] as any
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio failed");
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await decodeAudioData(decodeBase64(base64Audio), ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speed;
    source.connect(ctx.destination);
    source.start();
  } catch (error) {
    console.error("TTS Error:", error);
  }
};