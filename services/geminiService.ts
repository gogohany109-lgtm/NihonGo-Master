import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TranslationResult, PronunciationResult } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateTextToJapanese = async (
  text: string,
  sourceLanguage: string
): Promise<TranslationResult> => {
  try {
    const prompt = `
      Translate the following text from ${sourceLanguage} to Japanese.
      Provide the result in a structured JSON format.
      The translation should be natural.
      
      Requirements:
      1. Japanese: The translation in Kanji/Kana.
      2. Romaji: Standard romanization.
      3. Pronunciation: A phonetic guide using Romaji combined with symbols to help with speaking (e.g., use hyphens for syllable breaks 'ko-n-ni-chi-wa' or markers for pitch accents if relevant).
      4. English Meaning: The literal or nuanced meaning.
      5. Tone: Detect if it is Casual, Polite, or Formal.
      6. Breakdown: Analyze key words and provide a simple Japanese example sentence (with English translation) for each.
      7. Cultural Note: Optional context.

      Text to translate: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            japanese: { type: Type.STRING, description: "The Japanese translation in Kanji/Kana" },
            romaji: { type: Type.STRING, description: "Standard Romanized pronunciation" },
            pronunciation: { type: Type.STRING, description: "Phonetic guide (e.g., syllable-separated Romaji like 'ha-ji-me-ma-shi-te')" },
            englishMeaning: { type: Type.STRING, description: "Literal or nuance meaning in English" },
            tone: { type: Type.STRING, enum: ["Casual", "Polite", "Formal/Keigo"] },
            culturalNote: { type: Type.STRING, description: "Optional cultural context or usage tip" },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  romaji: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  exampleSentence: { type: Type.STRING, description: "A simple example sentence using this word, including English translation." }
                }
              }
            }
          },
          required: ["japanese", "romaji", "pronunciation", "englishMeaning", "tone", "breakdown"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TranslationResult;
    }
    throw new Error("No response text");
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    // Use gemini-3-flash-preview for multimodal tasks (audio to text) via generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            },
            {
              text: "Transcribe the spoken audio exactly into text. Do not add any explanation, punctuation explanations, or markdown. Just return the raw text of what was said."
            }
          ]
        }
      ]
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

export const evaluatePronunciation = async (
  base64Audio: string, 
  mimeType: string, 
  referenceText: string
): Promise<PronunciationResult> => {
  try {
    const prompt = `
      Listen to the audio. The speaker is trying to say this Japanese text: "${referenceText}".
      
      1. Transcribe exactly what you heard the speaker say in Japanese.
      2. Rate the pronunciation accuracy from 0 to 100.
      3. Provide brief, constructive feedback on what was mispronounced or could be improved.
      
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
            parts: [
                { inlineData: { mimeType: mimeType, data: base64Audio } },
                { text: prompt }
            ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Score from 0 to 100" },
            transcript: { type: Type.STRING, description: "What the AI actually heard" },
            feedback: { type: Type.STRING, description: "Constructive advice" }
          },
          required: ["score", "transcript", "feedback"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as PronunciationResult;
    }
    throw new Error("No evaluation response");
  } catch (error) {
      console.error("Evaluation error:", error);
      throw error;
  }
};

export const generateExampleSentence = async (word: string, meaning: string): Promise<string> => {
  try {
    const prompt = `Generate a simple, natural Japanese example sentence using the word "${word}" (which means "${meaning}").
    The sentence should be suitable for a beginner/intermediate learner.
    Output format: [Japanese Sentence] ([English Translation])
    Example: 猫がベッドで寝ています (The cat is sleeping on the bed)`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Error generating example sentence:", error);
    return "";
  }
};

export const playJapaneseAudio = async (text: string, speed: number = 1.0): Promise<void> => {
  const cleanText = text?.trim();
  if (!cleanText) return;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ['AUDIO'] as any, // Explicitly use string 'AUDIO' to avoid enum issues
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData?.data);
    const base64Audio = audioPart?.inlineData?.data;
    
    if (!base64Audio) {
        const finishReason = response.candidates?.[0]?.finishReason;
        // If the model returned text instead of audio, it likely refused the prompt.
        const textPart = parts.find(p => p.text);
        if (textPart?.text) {
             console.warn("TTS returned text instead of audio:", textPart.text);
        }
        
        console.warn(`TTS generation failed. Finish reason: ${finishReason}`);
        throw new Error("Failed to generate audio. The text might be unsupported or filtered.");
    }

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const outputNode = outputAudioContext.createGain();
    
    const audioBuffer = await decodeAudioData(
      decodeBase64(base64Audio),
      outputAudioContext,
      24000,
      1
    );

    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = speed;
    source.connect(outputNode);
    outputNode.connect(outputAudioContext.destination);
    source.start();

  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};