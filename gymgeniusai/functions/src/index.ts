import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Subscription tier configuration
const TIER_CONFIG = {
  basic: {
    costs: {
      mealPlan: 5000,
      macroEstimation: 2000,
      workoutPlan: 6000,
    },
  },
  pro: {
    limits: {
      mealPlans: 10,
      macroEstimations: 50,
      workoutPlans: 10,
    },
  },
  elite: {
    unlimited: true,
  },
};

/**
 * Helper function to check subscription tier and enforce limits
 */
async function checkTierAccess(
  userId: string,
  feature: 'mealPlan' | 'macroEstimation' | 'workoutPlan',
  deductVolts: boolean = true
): Promise<{ allowed: boolean; reason?: string; userDoc?: admin.firestore.DocumentSnapshot }> {
  const userDoc = await admin.firestore().doc(`users/${userId}`).get();
  
  if (!userDoc.exists) {
    return { allowed: false, reason: 'User not found' };
  }

  const userData = userDoc.data()!;
  const tier = userData.planTier || 'free';
  const points = userData.points || 0;

  // Free tier - no AI access
  if (tier === 'free') {
    return { allowed: false, reason: 'Upgrade to Basic, Pro, or Elite for AI features', userDoc };
  }

  // Elite tier - unlimited
  if (tier === 'elite') {
    return { allowed: true, userDoc };
  }

  // Basic tier - Volt-based
  if (tier === 'basic') {
    const cost = TIER_CONFIG.basic.costs[feature];
    if (points < cost) {
      return {
        allowed: false,
        reason: `Insufficient Volts. Need ${cost.toLocaleString()}V, have ${points.toLocaleString()}V`,
        userDoc,
      };
    }

    if (deductVolts) {
      await admin.firestore().doc(`users/${userId}`).update({
        points: admin.firestore.FieldValue.increment(-cost),
      });
    }

    return { allowed: true, userDoc };
  }

  // Pro tier - Monthly limits
  if (tier === 'pro') {
    const limitKey = feature === 'mealPlan' ? 'mealPlans' :
                     feature === 'macroEstimation' ? 'macroEstimations' : 'workoutPlans';
    const limit = TIER_CONFIG.pro.limits[limitKey as keyof typeof TIER_CONFIG.pro.limits];
    const usageKey = limitKey;
    
    const aiUsage = userData.aiUsage || {};
    const usage = aiUsage[usageKey] || { count: 0, resetDate: new Date() };
    
    // Check if reset date has passed (monthly reset)
    const now = new Date();
    const resetDate = usage.resetDate?.toDate ? usage.resetDate.toDate() : new Date(usage.resetDate);
    
    if (resetDate < now) {
      // Reset usage for new month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await admin.firestore().doc(`users/${userId}`).update({
        [`aiUsage.${usageKey}.count`]: 0,
        [`aiUsage.${usageKey}.resetDate`]: admin.firestore.Timestamp.fromDate(nextMonth),
      });
      return { allowed: true, userDoc };
    }

    if (usage.count >= limit) {
      return {
        allowed: false,
        reason: `Monthly limit reached. ${limit} ${feature} generations per month. Upgrade to Elite for unlimited.`,
        userDoc,
      };
    }

    // Increment usage
    await admin.firestore().doc(`users/${userId}`).update({
      [`aiUsage.${usageKey}.count`]: admin.firestore.FieldValue.increment(1),
      [`aiUsage.${usageKey}.lastUsed`]: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { allowed: true, userDoc };
  }

  return { allowed: false, reason: 'Invalid subscription tier', userDoc };
}

/**
 * Call Gemini API - using the correct endpoint format
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = functions.config().gemini?.api_key;
  
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
  }

  // Log prompt length for debugging
  console.log(`📝 Prompt length: ${prompt.length} characters`);
  console.log(`📝 Prompt preview (first 500 chars): ${prompt.substring(0, 500)}`);

  // Try gemini-2.0-flash first (more stable), fallback to 2.5-flash
  // Use the correct Gemini API endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048, // Further reduced - meal plans don't need 4k tokens
          topP: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 300),
      });
      
      // If 404, try gemini-2.5-flash as fallback
      if (response.status === 404) {
        console.log('⚠️ gemini-2.0-flash not found, trying gemini-2.5-flash...');
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt,
              }],
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              topP: 0.95,
            },
          }),
        });
        
        if (!fallbackResponse.ok) {
          const fallbackError = await fallbackResponse.text();
          console.error('Fallback model also failed:', fallbackError.substring(0, 300));
          throw new functions.https.HttpsError(
            'internal',
            `Both Gemini models failed. Last error: ${fallbackResponse.status} - ${fallbackError.substring(0, 200)}`
          );
        }
        
        // Use fallback response
        const fallbackData: any = await fallbackResponse.json();
        return extractTextFromResponse(fallbackData, prompt);
      }
      
      if (response.status === 401 || response.status === 403) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Gemini API key is invalid. Please check your API key configuration.'
        );
      }
      
      throw new functions.https.HttpsError(
        'internal',
        `Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`
      );
    }

    const data: any = await response.json();
    return extractTextFromResponse(data, prompt);
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Failed to call Gemini API: ${error.message}`);
  }
}

/**
 * Extract text from Gemini API response
 */
function extractTextFromResponse(data: any, prompt: string): string {
  // Log the full response structure for debugging
  console.log('Gemini API full response:', JSON.stringify(data, null, 2));
  
  // Log usage metadata if available
  if (data.usageMetadata) {
    console.log('Token usage:', {
      promptTokens: data.usageMetadata.promptTokenCount,
      responseTokens: data.usageMetadata.candidatesTokenCount,
      totalTokens: data.usageMetadata.totalTokenCount,
    });
  }
  
  // Safely extract the generated text
  if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
    console.error('Invalid response structure - no candidates:', JSON.stringify(data, null, 2));
    throw new functions.https.HttpsError('internal', 'Invalid response from Gemini API: no candidates found');
  }
    
    const candidate = data.candidates[0];
    
    // Check if the response was blocked, filtered, or truncated
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.error('Response finish reason:', candidate.finishReason, 'Candidate:', JSON.stringify(candidate, null, 2));
      
      // MAX_TOKENS means the response was truncated - we can still use what we got
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('Response was truncated due to token limit, but using available content');
        // Continue to extract text even if truncated
      } else if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new functions.https.HttpsError(
          'internal', 
          `Gemini API response was ${candidate.finishReason}. The content was filtered or blocked by safety filters.`
        );
      } else {
        // For other finish reasons, try to use the content if available
        console.warn('Unexpected finish reason:', candidate.finishReason, 'but attempting to extract content');
      }
    }
    
    // Check for content structure
    if (!candidate.content) {
      console.error('No content in candidate:', JSON.stringify(candidate, null, 2));
      throw new functions.https.HttpsError('internal', 'Invalid response from Gemini API: candidate has no content');
    }
    
    // Handle different response structures
    let generatedText: string | undefined;
    
    // Standard structure: content.parts[0].text
    if (candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
      generatedText = candidate.content.parts[0]?.text;
    }
    
    // Alternative: check if text is directly in content
    if (!generatedText && (candidate.content as any).text) {
      generatedText = (candidate.content as any).text;
    }
    
    // Alternative: check if there's text elsewhere in the candidate
    if (!generatedText && (candidate as any).text) {
      generatedText = (candidate as any).text;
    }
    
    // If still no text, log the full response for debugging
    if (!generatedText) {
      const fullResponse = JSON.stringify(candidate, null, 2);
      console.error('No text found in response. Full candidate structure:', fullResponse);
      console.error('Content object:', JSON.stringify(candidate.content, null, 2));
      
      // If MAX_TOKENS and no parts, check if this is a known Gemini API quirk
      if (candidate.finishReason === 'MAX_TOKENS') {
        // Check usage metadata to see if any tokens were actually generated
        const usageMetadata = (data as any).usageMetadata;
        if (usageMetadata && usageMetadata.candidatesTokenCount === 0) {
          console.error('MAX_TOKENS with 0 candidate tokens - prompt may be too long or model issue');
          throw new functions.https.HttpsError(
            'internal', 
            'The prompt is too long or complex. The AI could not generate any response. Please try with simpler requirements.'
          );
        }
        
        // Sometimes when MAX_TOKENS happens very early, parts might be empty
        // Check if there's any text in the response at all
        const responseString = JSON.stringify(data, null, 2);
        const textMatch = responseString.match(/"text"\s*:\s*"([^"]+)"/);
        
        if (textMatch && textMatch[1]) {
          console.warn('Found text in response string but not in parts array. Using extracted text.');
          return textMatch[1];
        }
        
        // If we have candidate tokens but no parts, the response might be in a different format
        if (usageMetadata && usageMetadata.candidatesTokenCount > 0) {
          console.error('MAX_TOKENS with candidate tokens but no parts array. Response structure issue.');
          throw new functions.https.HttpsError(
            'internal', 
            'Response was truncated before completion. The meal plan may be too complex. Please try again or simplify your requirements.'
          );
        }
        
        throw new functions.https.HttpsError(
          'internal', 
          'Response hit token limit but no content was generated. Try reducing the prompt length or simplifying the request.'
        );
      }
      
      throw new functions.https.HttpsError('internal', 'No text generated from Gemini AI. Response structure may have changed.');
    }

    return generatedText;
}

/**
 * Generate personalized meal plan
 */
export const generateMealPlan = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { request } = data;
  const userId = context.auth.uid;

  // Check tier access
  const access = await checkTierAccess(userId, 'mealPlan');
  if (!access.allowed) {
    throw new functions.https.HttpsError('permission-denied', access.reason || 'Access denied');
  }

  try {
    const prompt = buildMealPlanPrompt(request);
    const generatedText = await callGeminiAPI(prompt);
    
    // Log usage
    await admin.firestore().collection('ai_usage_logs').add({
      userId,
      feature: 'mealPlan',
      tier: access.userDoc?.data()?.planTier,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { text: generatedText, request };
  } catch (error: any) {
    console.error('Error generating meal plan:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to generate meal plan');
  }
});

/**
 * Estimate macros for a meal
 */
export const estimateMacros = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { mealName, servingSize } = data;
  const userId = context.auth.uid;

  // Check tier access
  const access = await checkTierAccess(userId, 'macroEstimation');
  if (!access.allowed) {
    throw new functions.https.HttpsError('permission-denied', access.reason || 'Access denied');
  }

  try {
    const prompt = `Estimate the nutritional macros for this meal:
Meal Name: ${mealName}
Serving Size: ${servingSize}

Provide a JSON response with this exact format:
{
  "calories": <number>,
  "protein": <number>,
  "carbs": <number>,
  "fat": <number>
}

Be realistic and accurate. Only return the JSON, no other text.`;

    const generatedText = await callGeminiAPI(prompt);
    
    // Try to parse JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const macros = JSON.parse(jsonMatch[0]);
      
      // Log usage
      await admin.firestore().collection('ai_usage_logs').add({
        userId,
        feature: 'macroEstimation',
        tier: access.userDoc?.data()?.planTier,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return macros;
    }

    throw new functions.https.HttpsError('internal', 'Failed to parse macro estimation');
  } catch (error: any) {
    console.error('Error estimating macros:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to estimate macros');
  }
});

/**
 * Analyze food image and estimate macros
 */
export const analyzeFoodImage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { image, mimeType } = data;
  const userId = context.auth.uid;

  if (!image) {
    throw new functions.https.HttpsError('invalid-argument', 'Image is required');
  }

  // Check tier access
  const access = await checkTierAccess(userId, 'macroEstimation');
  if (!access.allowed) {
    throw new functions.https.HttpsError('permission-denied', access.reason || 'Access denied');
  }

  try {
    const apiKey = functions.config().gemini?.api_key;
    
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
    }

    // Use Gemini Vision API to analyze the food image
    const prompt = `Analyze this food image and provide:
1. The name of the food/meal
2. The estimated serving size (amount and unit, e.g., "200g", "1 cup", "1 piece")
3. The nutritional macros for that serving size

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "name": "<food name>",
  "servingAmount": <number>,
  "servingUnit": "<unit>",
  "macros": {
    "calories": <number>,
    "protein": <number>,
    "carbs": <number>,
    "fat": <number>
  }
}

Be accurate and realistic. If you can't identify the food clearly, provide your best estimate based on what you see.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: prompt,
            },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: image,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.4, // Lower temperature for more consistent results
          maxOutputTokens: 512,
          topP: 0.95,
        },
      }),
    });

    if (!response.ok) {
      // Try fallback model
      if (response.status === 404) {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: image,
                  },
                },
              ],
            }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 512,
              topP: 0.95,
            },
          }),
        });

        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          console.error('Gemini Vision API error:', errorText);
          throw new functions.https.HttpsError(
            'internal',
            `Failed to analyze image: ${fallbackResponse.status}`
          );
        }

        const fallbackData: any = await fallbackResponse.json();
        const generatedText = extractTextFromResponse(fallbackData, prompt);
        
        // Parse JSON from response
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          
          // Log usage
          await admin.firestore().collection('ai_usage_logs').add({
            userId,
            feature: 'macroEstimation',
            tier: access.userDoc?.data()?.planTier,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

          return result;
        }
      } else {
        const errorText = await response.text();
        console.error('Gemini Vision API error:', errorText);
        throw new functions.https.HttpsError(
          'internal',
          `Failed to analyze image: ${response.status}`
        );
      }
    }

    const apiData: any = await response.json();
    const generatedText = extractTextFromResponse(apiData, prompt);
    
    // Parse JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      // Validate result structure
      if (!result.name || !result.macros) {
        throw new functions.https.HttpsError('internal', 'Invalid response format from AI');
      }

      // Log usage
      await admin.firestore().collection('ai_usage_logs').add({
        userId,
        feature: 'macroEstimation',
        tier: access.userDoc?.data()?.planTier,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return result;
    }

    throw new functions.https.HttpsError('internal', 'Failed to parse food analysis response');
  } catch (error: any) {
    console.error('Error analyzing food image:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'Failed to analyze food image');
  }
});

/**
 * Generate role-based progress insights (Elite tier only)
 */
export const generateProgressInsightsByRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { rolePerspective, trendData, insightsData, exerciseProgress, personalRecords, workoutHistory } = data;
  const userId = context.auth.uid;

  // Get user document to check tier
  const userDoc = await admin.firestore().doc(`users/${userId}`).get();
  const userData = userDoc.data();
  
  if (!userData || userData.planTier !== 'elite') {
    throw new functions.https.HttpsError('permission-denied', 'This feature is only available for Elite tier users.');
  }

  if (!rolePerspective || !['personal', 'trainer', 'coach'].includes(rolePerspective)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role perspective. Must be personal, trainer, or coach.');
  }

  try {
    // Build prompt based on role perspective
    let perspectivePrompt = '';
    
    if (rolePerspective === 'personal') {
      perspectivePrompt = `You are analyzing YOUR OWN progress data. Provide insights from a personal fitness enthusiast standpoint. Focus on:
- Personal achievements and progress
- Individual strengths and areas for improvement
- Personal recommendations for continued growth
- Self-motivation and personal development insights`;
    } else if (rolePerspective === 'trainer') {
      perspectivePrompt = `You are analyzing a CLIENT'S progress data from a TRAINER's perspective. Provide insights from a professional trainer standpoint. Focus on:
- Client performance analysis and assessment
- Professional training recommendations
- Client progress evaluation
- Training program adjustments and optimization
- Client motivation and engagement strategies`;
    } else if (rolePerspective === 'coach') {
      perspectivePrompt = `You are analyzing a PLAYER'S progress data from a COACH's perspective. Provide insights from a team coach standpoint. Focus on:
- Player performance evaluation and assessment
- Team-oriented training recommendations
- Player development and progression tracking
- Strategic training adjustments
- Player readiness and performance optimization`;
    }

    // Build comprehensive prompt with user data
    const prompt = `${perspectivePrompt}

Analyze the following progress data and provide comprehensive, detailed insights:

TREND DATA:
- Workouts per week: ${trendData.workoutsPerWeek.toFixed(1)}
- Volume by muscle group: ${JSON.stringify(trendData.volumeByMuscleGroup.slice(0, 10))}
- Exercise highlights: ${JSON.stringify(trendData.exerciseHighlights.slice(0, 5))}
- Exercise progress: ${JSON.stringify(exerciseProgress.slice(0, 10))}

INSIGHTS DATA:
- Weak points: ${JSON.stringify(insightsData.weakPoints.filter((wp: any) => wp.isWeakPoint).slice(0, 5))}
- Fatigue warning: ${insightsData.fatigueWarning.hasSpike ? `Volume spike detected: ${insightsData.fatigueWarning.increasePercentage.toFixed(0)}% increase` : 'No significant fatigue warning'}

PERSONAL RECORDS:
${personalRecords.slice(0, 10).map((pr: any) => `- ${pr.exercise}: ${pr.estimated1RM} lbs`).join('\n')}

WORKOUT HISTORY SUMMARY:
- Total workouts: ${workoutHistory.length}
- Recent workout dates: ${workoutHistory.slice(-5).map((w: any) => new Date(w.date).toLocaleDateString()).join(', ')}

Provide a comprehensive analysis (at least 500 words) that includes:
1. Overall progress assessment
2. Key strengths and achievements
3. Areas needing attention
4. Specific, actionable recommendations
5. Next steps for continued progress

Write in a ${rolePerspective === 'personal' ? 'motivational and personal' : rolePerspective === 'trainer' ? 'professional trainer' : 'professional coach'} tone. Be specific, actionable, and encouraging.`;

    const generatedText = await callGeminiAPI(prompt);
    
    // Log usage
    await admin.firestore().collection('ai_usage_logs').add({
      userId,
      feature: 'progressInsightsByRole',
      tier: 'elite',
      rolePerspective,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return generatedText;
  } catch (error: any) {
    console.error('Error generating role-based progress insights:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'Failed to generate role-based progress insights');
  }
});

/**
 * Generate workout plan
 */
export const generateWorkoutPlan = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { request } = data;
  const userId = context.auth.uid;

  // Check tier access
  const access = await checkTierAccess(userId, 'workoutPlan');
  if (!access.allowed) {
    throw new functions.https.HttpsError('permission-denied', access.reason || 'Access denied');
  }

  try {
    const prompt = buildWorkoutPlanPrompt(request);
    const generatedText = await callGeminiAPI(prompt);
    
    // Log usage
    await admin.firestore().collection('ai_usage_logs').add({
      userId,
      feature: 'workoutPlan',
      tier: access.userDoc?.data()?.planTier,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { text: generatedText, request };
  } catch (error: any) {
    console.error('Error generating workout plan:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to generate workout plan');
  }
});

/**
 * Generate team workout plans (Coach feature)
 */
export const generateTeamWorkoutPlans = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { teamId, players, schedule } = data;
  const userId = context.auth.uid;

  // Verify user is a coach
  const userDoc = await admin.firestore().doc(`users/${userId}`).get();
  const userData = userDoc.data();
  
  if (!userData || (userData.role !== 'coach' && userData.institutionRole !== 'coach')) {
    throw new functions.https.HttpsError('permission-denied', 'Only coaches can generate team workout plans');
  }

  try {
    const prompt = buildTeamWorkoutPrompt(players, schedule);
    const generatedText = await callGeminiAPI(prompt);
    
    // Log usage
    await admin.firestore().collection('ai_usage_logs').add({
      userId,
      feature: 'teamWorkoutPlans',
      tier: userData.planTier,
      teamId,
      playerCount: players.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { text: generatedText, players, schedule };
  } catch (error: any) {
    console.error('Error generating team workout plans:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to generate team workout plans');
  }
});

/**
 * Generate player progress summary (Coach feature)
 */
export const generatePlayerSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { playerId, timeRange } = data;
  const userId = context.auth.uid;

  // Verify user is a coach
  const userDoc = await admin.firestore().doc(`users/${userId}`).get();
  const userData = userDoc.data();
  
  if (!userData || (userData.role !== 'coach' && userData.institutionRole !== 'coach')) {
    throw new functions.https.HttpsError('permission-denied', 'Only coaches can generate player summaries');
  }

  try {
    // Fetch player data
    const playerDoc = await admin.firestore().doc(`users/${playerId}`).get();
    const playerData = playerDoc.data();
    
    // Fetch player workouts
    const workoutsSnapshot = await admin.firestore()
      .collection('workouts')
      .where('uid', '==', playerId)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    const workouts = workoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const prompt = buildPlayerSummaryPrompt(playerData, workouts, timeRange);
    const generatedText = await callGeminiAPI(prompt);
    
    // Log usage
    await admin.firestore().collection('ai_usage_logs').add({
      userId,
      feature: 'playerSummary',
      tier: userData.planTier,
      playerId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { text: generatedText, playerId, timeRange };
  } catch (error: any) {
    console.error('Error generating player summary:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to generate player summary');
  }
});

/**
 * Generate workout tips during workout
 */
export const generateWorkoutTips = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { exercise, currentSet, totalSets, formNotes, progress } = data;
  const userId = context.auth.uid;

  // Check tier - workout tips available for all paid tiers
  const userDoc = await admin.firestore().doc(`users/${userId}`).get();
  const userData = userDoc.data();
  const tier = userData?.planTier || 'free';

  if (tier === 'free') {
    throw new functions.https.HttpsError('permission-denied', 'Upgrade for AI workout tips');
  }

  try {
    const prompt = `Provide a brief, actionable workout tip for this exercise:
Exercise: ${exercise}
Current Set: ${currentSet}/${totalSets}
Form Notes: ${formNotes || 'None'}
Progress: ${progress || 'Standard'}

Provide 1-2 short tips (max 50 words total). Focus on form, motivation, or strategy.`;

    const generatedText = await callGeminiAPI(prompt);
    
    return { tip: generatedText.trim() };
  } catch (error: any) {
    console.error('Error generating workout tip:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to generate workout tip');
  }
});

/**
 * Suggest next exercise based on current workout context
 */
export const suggestNextExercise = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { workoutType, exercises, summary } = data || {};
  const userId = context.auth.uid;

  if (!workoutType || !Array.isArray(exercises) || exercises.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Workout type and at least one exercise are required for suggestions.'
    );
  }

  try {
    const access = await checkTierAccess(userId, 'workoutPlan', false);
    if (!access.allowed) {
      throw new functions.https.HttpsError('permission-denied', access.reason || 'Upgrade for AI exercise suggestions');
    }

    const userProfile = access.userDoc?.data();
    
    // DEBUG: Log incoming data
    console.log('=== INCOMING EXERCISE DATA ===');
    console.log('Exercises received:', JSON.stringify(exercises, null, 2));
    const lastExercise = exercises[exercises.length - 1];
    console.log('Last exercise name:', lastExercise?.name);
    console.log('Last exercise muscleGroup (from client):', lastExercise?.muscleGroup);
    console.log('=== END INCOMING DATA ===');
    
    // Analyze workout pattern to determine dominant muscle group
    // This considers ALL exercises, not just the last one
    // Filter out cardio and exercises without proper muscle groups
    const strengthExercises = exercises.filter(ex => 
      ex.type !== 'cardio' && ex.muscleGroup && ex.muscleGroup !== 'Unknown' && ex.muscleGroup !== 'Full Body'
    );
    
    const muscleGroupPattern: Record<string, { count: number; totalSets: number }> = {};
    strengthExercises.forEach(ex => {
      const group = ex.muscleGroup!;
      if (!muscleGroupPattern[group]) {
        muscleGroupPattern[group] = { count: 0, totalSets: 0 };
      }
      muscleGroupPattern[group].count++;
      muscleGroupPattern[group].totalSets += (ex.completedSets ?? ex.sets ?? 0);
    });
    
    // Find dominant muscle group (most exercises, then most sets)
    const sortedGroups = Object.entries(muscleGroupPattern)
      .sort((a, b) => {
        if (b[1].count !== a[1].count) {
          return b[1].count - a[1].count;
        }
        return b[1].totalSets - a[1].totalSets;
      });
    
    const dominantGroup = sortedGroups[0]?.[0];
    const dominantGroupData = dominantGroup ? muscleGroupPattern[dominantGroup] : null;
    
    // Get the last strength exercise (not cardio) to determine target group
    const lastStrengthExercise = strengthExercises[strengthExercises.length - 1];
    const lastExerciseFromAll = exercises[exercises.length - 1];
    const lastExerciseGroup = lastStrengthExercise?.muscleGroup || lastExerciseFromAll?.muscleGroup || 'Legs';
    
    // Determine target group: Use dominant group if it has 2+ exercises, otherwise use last exercise's group
    let validatedTargetMuscleGroup: string;
    if (dominantGroup && dominantGroupData && dominantGroupData.count >= 2) {
      // Clear pattern - use dominant group
      validatedTargetMuscleGroup = dominantGroup;
      console.log(`✅ Workout pattern detected: ${dominantGroupData.count} ${dominantGroup} exercises. Using ${dominantGroup} for suggestion.`);
    } else if (dominantGroup && lastExerciseGroup === dominantGroup) {
      // Last exercise matches dominant, use it
      validatedTargetMuscleGroup = dominantGroup;
      console.log(`✅ Last exercise matches dominant pattern. Using ${dominantGroup} for suggestion.`);
    } else {
      // No clear pattern yet, use last exercise
      validatedTargetMuscleGroup = lastExerciseGroup;
      console.log(`ℹ️ No clear pattern (only ${dominantGroupData?.count || 0} exercises). Using last exercise group: ${lastExerciseGroup}`);
    }
    
    console.log('=== MUSCLE GROUP ANALYSIS ===');
    console.log('Total exercises:', exercises.length);
    console.log('Strength exercises:', strengthExercises.length);
    console.log('All exercises:', exercises.map(e => `${e.name} (${e.type}, ${e.muscleGroup || 'NO MUSCLE GROUP'})`).join(', '));
    console.log('Muscle group pattern:', JSON.stringify(muscleGroupPattern, null, 2));
    console.log('Dominant muscle group:', dominantGroup || 'None');
    console.log('Dominant group count:', dominantGroupData?.count || 0);
    console.log('Last strength exercise:', lastStrengthExercise?.name || 'None');
    console.log('Last exercise muscle group:', lastExerciseGroup);
    console.log('Target muscle group for suggestion:', validatedTargetMuscleGroup);
    console.log('=== END ANALYSIS ===');
    
    const prompt = buildNextExercisePrompt({
      workoutType,
      exercises,
      summary,
      userProfile,
      requiredMuscleGroup: validatedTargetMuscleGroup, // Pass the required group
    });
    
    // Extract valid exercises for validation
    const exampleExercises = {
      'Legs': ['Leg Curl', 'Romanian Deadlift', 'Bulgarian Split Squat', 'Leg Extension', 'Calf Raise', 'Leg Press', 'Squat', 'Lunges'],
      'Chest': ['Incline Press', 'Incline Dumbbell Press', 'Cable Flyes', 'Chest Flyes', 'Dumbbell Press', 'Bench Press', 'Push-ups', 'Dips', 'Decline Press', 'Pec Deck'],
      'Back': ['Lat Pulldown', 'T-Bar Row', 'Cable Row', 'Pull-ups', 'Face Pulls', 'Barbell Row', 'Seated Row', 'Single-Arm Row'],
      'Shoulders': ['Lateral Raise', 'Rear Delt Fly', 'Overhead Press', 'Front Raise', 'Shrugs', 'Shoulder Press'],
      'Arms': ['Hammer Curl', 'Tricep Extension', 'Bicep Curl', 'Tricep Pushdown', 'Cable Curl'],
      'Core': ['Plank', 'Russian Twist', 'Leg Raises', 'Crunches', 'Dead Bug']
    };
    const validExercises = exampleExercises[validatedTargetMuscleGroup as keyof typeof exampleExercises] || exampleExercises['Legs'];
    
    // Log the prompt for debugging
    console.log('=== AI EXERCISE SUGGESTION PROMPT ===');
    console.log('Last exercise:', exercises[exercises.length - 1]?.name);
    console.log('Last exercise muscle group:', exercises[exercises.length - 1]?.muscleGroup);
    console.log('Validated target muscle group:', validatedTargetMuscleGroup);
    console.log('Valid exercises for this group:', validExercises);
    console.log('Full prompt:', prompt);
    console.log('=== END PROMPT ===');
    
    const generatedText = await callGeminiAPI(prompt);
    
    // Log AI response
    console.log('=== AI RESPONSE ===');
    console.log('Raw AI response:', generatedText);
    console.log('=== END RESPONSE ===');
    
    const suggestion = parseNextExerciseResponse(generatedText, validatedTargetMuscleGroup, lastExercise?.name, validExercises);
    
    // Log final suggestion
    console.log('=== FINAL SUGGESTION ===');
    console.log('Exercise:', suggestion.exercise);
    console.log('Muscle Group:', suggestion.muscleGroup);
    console.log('Expected:', validatedTargetMuscleGroup);
    console.log('=== END SUGGESTION ===');

    // Log usage for auditing
    await admin.firestore().collection('ai_usage_logs').add({
      userId,
      feature: 'exerciseSuggestion',
      tier: userProfile?.planTier,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return suggestion along with prompt for debugging
    return { 
      suggestion,
      debug: {
        prompt,
        targetMuscleGroup: validatedTargetMuscleGroup,
        validExercises
      }
    };
  } catch (error: any) {
    console.error('Error suggesting next exercise:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'Failed to suggest next exercise');
  }
});

/**
 * Build meal plan prompt
 */
function buildMealPlanPrompt(request: any): string {
  const { firstName, goal, targetMacros, dietaryPreference } = request;
  
  const goalDescriptions: Record<string, string> = {
    build_muscle: 'build muscle and gain strength',
    lose_weight: 'lose weight and burn fat',
    stay_fit: 'maintain fitness and health',
    increase_endurance: 'increase endurance and stamina',
    gain_strength: 'gain strength and lift heavier',
    increase_power: 'increase explosive power and performance',
    improve_flexibility: 'improve flexibility and mobility',
    general_health: 'improve overall health and wellbeing',
    improve_fitness: 'improve overall fitness',
  };
  
  const goalDescription = goalDescriptions[goal] || 'achieve fitness goals';
  
  // Balanced prompt - clear but not too long
  const prompt = `Meal plan for ${firstName} (${goalDescription}).
Target: ${targetMacros.calories}cal ${targetMacros.protein}P ${targetMacros.carbs}C ${targetMacros.fat}F
Diet: ${dietaryPreference || 'balanced'}

Generate 4 meals (breakfast, lunch, dinner, snack) in this format:

MEAL: [name]
TYPE: breakfast
CALORIES: [num]
PROTEIN: [num]g
CARBS: [num]g
FAT: [num]g
INGREDIENTS:
- [amt] [unit] [item]
- [amt] [unit] [item]
---

MEAL: [name]
TYPE: lunch
CALORIES: [num]
PROTEIN: [num]g
CARBS: [num]g
FAT: [num]g
INGREDIENTS:
- [amt] [unit] [item]
- [amt] [unit] [item]
---

MEAL: [name]
TYPE: dinner
CALORIES: [num]
PROTEIN: [num]g
CARBS: [num]g
FAT: [num]g
INGREDIENTS:
- [amt] [unit] [item]
- [amt] [unit] [item]
---

MEAL: [name]
TYPE: snack
CALORIES: [num]
PROTEIN: [num]g
CARBS: [num]g
FAT: [num]g
INGREDIENTS:
- [amt] [unit] [item]
- [amt] [unit] [item]
---

All 4 required.`;

  console.log(`📝 Meal plan prompt length: ${prompt.length} characters`);
  return prompt;
}

/**
 * Build workout plan prompt
 */
function buildWorkoutPlanPrompt(request: any): string {
  const { goal, experience, equipment, weeklySchedule, injuries, targetMuscleGroups, pastWorkouts, firstName } = request;
  
  // Concise header
  let prompt = `Workout plan for ${firstName || 'user'} (${goal}).
Level: ${experience} | Equipment: ${equipment} | Schedule: ${weeklySchedule || 3} days/week
${injuries ? `Avoid: ${injuries}` : 'No restrictions'}
Target: ${targetMuscleGroups && targetMuscleGroups.length > 0 ? targetMuscleGroups.join(', ') : 'Full Body'}
`;

  // Add condensed past workout data
  if (pastWorkouts && pastWorkouts.length > 0) {
    const exerciseHistory: Record<string, any[]> = {};
    pastWorkouts.forEach((w: any) => {
      if (!exerciseHistory[w.exerciseName]) {
        exerciseHistory[w.exerciseName] = [];
      }
      exerciseHistory[w.exerciseName].push(w);
    });
    
    prompt += `\nRecent performance:\n`;
    Object.entries(exerciseHistory).slice(0, 5).forEach(([exerciseName, workouts]) => {
      const mostRecent = workouts[workouts.length - 1];
      prompt += `${exerciseName}: ${mostRecent.sets}×${mostRecent.reps}${mostRecent.weight ? ` @${mostRecent.weight}lb` : ''}\n`;
    });
  }

  prompt += `\nFormat:
EXERCISE: [name]
MUSCLE_GROUP: [group]
SETS: [num]
REPS: [num or range]
REST: [time]
WEIGHT: [suggestion]
NOTES: [tip]
---

Generate workout plan:`;

  return prompt;
}

interface NextExercisePromptInput {
  workoutType: 'strength' | 'cardio';
  exercises: Array<{
    name: string;
    muscleGroup?: string;
    type?: string;
    sets?: number;
    completedSets?: number;
    avgReps?: number;
    avgWeight?: number;
    totalVolume?: number;
    equipment?: string[] | string;
  }>;
  summary?: {
    missingMuscles?: string[];
    leastWorkedMuscle?: string;
    mostWorkedMuscle?: string;
  };
  userProfile?: admin.firestore.DocumentData;
  requiredMuscleGroup: string; // The muscle group that MUST be suggested
}

function buildNextExercisePrompt(payload: NextExercisePromptInput): string {
  const { exercises } = payload;

  // Analyze workout pattern - group exercises by muscle group
  const muscleGroupPattern: Record<string, { count: number; exercises: string[]; totalSets: number }> = {};
  
  // Filter out cardio and exercises without muscle groups
  const strengthExercises = exercises.filter(ex => 
    ex.type !== 'cardio' && ex.muscleGroup && ex.muscleGroup !== 'Unknown' && ex.muscleGroup !== 'Full Body'
  );
  
  strengthExercises.forEach(ex => {
    const group = ex.muscleGroup!;
    if (!muscleGroupPattern[group]) {
      muscleGroupPattern[group] = { count: 0, exercises: [], totalSets: 0 };
    }
    muscleGroupPattern[group].count++;
    muscleGroupPattern[group].exercises.push(ex.name);
    muscleGroupPattern[group].totalSets += (ex.completedSets ?? ex.sets ?? 0);
  });
  
  // Determine the dominant muscle group from ALL exercises (not just the last one)
  // This finds the muscle group that the user has done the most exercises for
  const sortedGroups = Object.entries(muscleGroupPattern)
    .sort((a, b) => {
      // Primary sort: by exercise count
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count;
      }
      // Secondary sort: by total sets
      return b[1].totalSets - a[1].totalSets;
    });
  
  const dominantGroup = sortedGroups[0]?.[0];
  
  // Get the last strength exercise (not cardio)
  const lastStrengthExercise = strengthExercises[strengthExercises.length - 1];
  const lastExercise = exercises[exercises.length - 1];
  const lastExerciseName = lastStrengthExercise?.name || lastExercise?.name || 'Unknown';
  const lastExerciseGroup = lastStrengthExercise?.muscleGroup || lastExercise?.muscleGroup || 'Unknown';

  // Calculate volume for the dominant group
  const dominantGroupData = dominantGroup ? muscleGroupPattern[dominantGroup] : null;

      // Determine target group: Use dominant group if it has 2+ exercises, otherwise use last exercise's group
      // IMPORTANT: If there's only 1 exercise, always use that exercise's group (not dominant)
      let actualTargetGroup: string;
      
      if (strengthExercises.length === 1) {
        // Only 1 exercise - definitely use its muscle group
        actualTargetGroup = lastExerciseGroup;
      } else if (dominantGroup && dominantGroupData && dominantGroupData.count >= 2) {
        // Clear pattern with 2+ exercises in dominant group
        actualTargetGroup = dominantGroup;
      } else if (dominantGroup && lastExerciseGroup === dominantGroup) {
        // Last exercise matches dominant pattern
        actualTargetGroup = dominantGroup;
      } else {
        // No clear pattern - use last exercise's group (most recent activity)
        actualTargetGroup = lastExerciseGroup;
      }
      
      // Safety check: If we can't determine a group, use the last exercise
      if (!actualTargetGroup || actualTargetGroup === 'Unknown') {
        actualTargetGroup = lastExerciseGroup || 'Legs';
      }
  
  // Build simple, clear examples based on the actual workout
  const exampleExercises = {
    'Legs': ['Leg Curl', 'Romanian Deadlift', 'Bulgarian Split Squat', 'Leg Extension', 'Calf Raise', 'Leg Press', 'Squat', 'Lunges'],
    'Chest': ['Incline Press', 'Incline Dumbbell Press', 'Cable Flyes', 'Chest Flyes', 'Dumbbell Press', 'Bench Press', 'Push-ups', 'Dips', 'Decline Press', 'Pec Deck'],
    'Back': ['Lat Pulldown', 'T-Bar Row', 'Cable Row', 'Pull-ups', 'Face Pulls', 'Barbell Row', 'Seated Row', 'Single-Arm Row'],
    'Shoulders': ['Lateral Raise', 'Rear Delt Fly', 'Overhead Press', 'Front Raise', 'Shrugs', 'Shoulder Press'],
    'Arms': ['Hammer Curl', 'Tricep Extension', 'Bicep Curl', 'Tricep Pushdown', 'Cable Curl'],
    'Core': ['Plank', 'Russian Twist', 'Leg Raises', 'Crunches', 'Dead Bug']
  };
  
  const examplesForGroup = exampleExercises[actualTargetGroup as keyof typeof exampleExercises] || exampleExercises['Legs'];
  
  // Build detailed context about the workout - show all exercises by group
  const workoutContextParts: string[] = [];
  
  // Show exercises already done in the target group (get from actual target group, not just dominant)
  const targetGroupData = muscleGroupPattern[actualTargetGroup] || null;
  const targetGroupExercises = targetGroupData?.exercises || [];
  
  if (targetGroupExercises.length > 0) {
    const exerciseList = targetGroupExercises.slice(0, 5).join(', ');
    workoutContextParts.push(`User is doing a ${actualTargetGroup} workout and has already done: ${exerciseList}${targetGroupExercises.length > 5 ? '...' : ''}`);
  } else if (lastExercise) {
    workoutContextParts.push(`User just did "${lastExerciseName}" which targets ${lastExerciseGroup}`);
    if (actualTargetGroup !== lastExerciseGroup) {
      workoutContextParts.push(`Continue with ${actualTargetGroup} exercises`);
    }
  }
  
  // Show what muscle groups the user has worked (to show pattern)
  const allGroupsWorked = Object.entries(muscleGroupPattern)
    .filter(([group]) => group !== 'Unknown')
    .map(([group, data]) => `${group} (${data.count} exercises)`)
    .join(', ');
  if (allGroupsWorked) {
    workoutContextParts.push(`Workout pattern: ${allGroupsWorked}`);
  }
  
  // Build list of groups to avoid (all except target)
  const allGroups = ['Legs', 'Chest', 'Back', 'Shoulders', 'Arms', 'Core'];
  const groupsToAvoid = allGroups.filter(g => g !== actualTargetGroup);
  
  // Get exercises already done in target group to avoid suggesting duplicates
  const alreadyDone = targetGroupExercises.map(e => e.toLowerCase());
  const availableExercises = examplesForGroup.filter(ex => {
    const exLower = ex.toLowerCase();
    return !alreadyDone.some(done => done.includes(exLower) || exLower.includes(done));
  });
  
  const exerciseListToShow = availableExercises.length > 0 ? availableExercises : examplesForGroup;
  
  return `CRITICAL INSTRUCTIONS - READ CAREFULLY:

${workoutContextParts.join('. ')}

TARGET MUSCLE GROUP: ${actualTargetGroup}
YOU MUST ONLY SUGGEST ${actualTargetGroup} EXERCISES. DO NOT SUGGEST EXERCISES FROM ANY OTHER MUSCLE GROUP.

VALID ${actualTargetGroup} EXERCISES TO CHOOSE FROM:
${exerciseListToShow.slice(0, 12).join(', ')}

ALREADY DONE IN THIS WORKOUT:
${targetGroupExercises.length > 0 ? targetGroupExercises.join(', ') : 'None yet'}

STRICT RULES:
1. exercise MUST be from the ${actualTargetGroup} list above
2. exercise MUST be different from exercises already done
3. muscleGroup MUST be exactly "${actualTargetGroup}" (do not change this)
4. DO NOT suggest exercises from these groups: ${groupsToAvoid.join(', ')}
5. rationale MUST only talk about ${actualTargetGroup} muscles
6. DO NOT mention: balance, switching groups, overall workout, or other muscle groups

RETURN JSON:
{
  "exercise": "Pick one exercise from the ${actualTargetGroup} list above that hasn't been done yet",
  "muscleGroup": "${actualTargetGroup}",
  "sets": 3,
  "reps": "8-12",
  "rationale": "This ${actualTargetGroup.toLowerCase()} exercise continues your ${actualTargetGroup.toLowerCase()} workout",
  "cues": ["Form tip 1", "Form tip 2"]
}

REMEMBER: User is doing a ${actualTargetGroup} workout. Suggest ONLY ${actualTargetGroup} exercises.`;
}

interface NextExerciseSuggestion {
  exercise: string;
  muscleGroup?: string;
  sets?: number;
  reps?: string;
  rationale?: string;
  cues?: string[];
}

function parseNextExerciseResponse(text: string, requiredMuscleGroup: string, lastExerciseName?: string, validExerciseExamples?: string[]): NextExerciseSuggestion {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // ALWAYS use requiredMuscleGroup - ignore what AI says
      // AI only suggests exercise name, not muscle group
      const validatedMuscleGroup = requiredMuscleGroup;
      
      if (parsed.muscleGroup !== requiredMuscleGroup) {
        console.warn(`⚠️ AI suggested wrong muscle group: ${parsed.muscleGroup}, forcing to: ${requiredMuscleGroup}`);
      }
      
      // Validate exercise name matches muscle group
      const exerciseName = parsed.exercise || '';
      const exerciseNameLower = exerciseName.toLowerCase().trim();
      const exerciseNameClean = exerciseName.replace(/\s*\([^)]*\)\s*/g, '').trim(); // Remove equipment in parentheses
      const exerciseNameCleanLower = exerciseNameClean.toLowerCase().trim();
      
      // Known exercises by muscle group (from exercise database) - all lowercase for matching
      const chestExercises = ['bench press', 'incline press', 'decline press', 'chest flyes', 'incline flyes', 'decline flyes', 'push-ups', 'dips', 'pec deck', 'cable crossover', 'chest press', 'dumbbell press', 'cable flyes', 'push ups', 'pushup', 'pushup'];
      const legExercises = ['squat', 'leg press', 'leg curl', 'leg extension', 'lunge', 'bulgarian split squat', 'romanian deadlift', 'calf raise', 'hamstring curl', 'quad extension', 'hip thrust', 'glute bridge', 'squats', 'leg presses', 'lunges'];
      const backExercises = ['deadlift', 'barbell row', 'lat pulldown', 'pull-ups', 'chin-ups', 'seated row', 't-bar row', 'single-arm row', 'face pulls', 'reverse flyes', 'hyperextensions', 'good mornings', 'cable row', 'pullups', 'chinups', 'pull ups', 'chin ups'];
      
      // CRITICAL: Check exercise name against wrong muscle groups FIRST
      // If target is Chest, immediately reject if exercise is clearly a leg or back exercise
      if (validatedMuscleGroup === 'Chest') {
        // Check if exercise name contains leg exercise keywords
        const isLegKeyword = legExercises.some(legEx => {
          const legLower = legEx.toLowerCase();
          return exerciseNameLower === legLower || 
                 exerciseNameLower.includes(legLower) || 
                 legLower.includes(exerciseNameLower) ||
                 exerciseNameCleanLower === legLower ||
                 exerciseNameCleanLower.includes(legLower) ||
                 legLower.includes(exerciseNameCleanLower);
        });
        
        // Check for common leg exercise patterns
        const hasLegPattern = /squat|lunge|leg\s*(press|curl|extension)|calf|hamstring|quad|glute|hip\s*thrust/i.test(exerciseName);
        
        if (isLegKeyword || hasLegPattern) {
          console.error(`❌ REJECTED: "${exerciseName}" is a LEG exercise but target is CHEST`);
          throw new Error(`AI suggested leg exercise "${exerciseName}" when target is Chest`);
        }
        
        // Check if exercise name contains back exercise keywords
        const isBackKeyword = backExercises.some(backEx => {
          const backLower = backEx.toLowerCase();
          return exerciseNameLower === backLower || 
                 exerciseNameLower.includes(backLower) || 
                 backLower.includes(exerciseNameLower) ||
                 exerciseNameCleanLower === backLower ||
                 exerciseNameCleanLower.includes(backLower) ||
                 backLower.includes(exerciseNameCleanLower);
        });
        
        const hasBackPattern = /row|pull|deadlift|lat\s*pulldown|face\s*pull|reverse\s*fly|hyperextension|good\s*morning/i.test(exerciseName);
        
        if (isBackKeyword || hasBackPattern) {
          console.error(`❌ REJECTED: "${exerciseName}" is a BACK exercise but target is CHEST`);
          throw new Error(`AI suggested back exercise "${exerciseName}" when target is Chest`);
        }
      }
      
      // STRICT VALIDATION: Check if the suggested exercise is in the valid list
      const validExercisesLower = (validExerciseExamples || []).map(ex => ex.toLowerCase());
      
      // Check if exercise matches any valid exercise (fuzzy match)
      const isKnownExercise = validExercisesLower.some(valid => {
        const validLower = valid.toLowerCase();
        return exerciseNameCleanLower.includes(validLower) || 
               validLower.includes(exerciseNameCleanLower) ||
               exerciseNameCleanLower === validLower;
      });
      
      // CRITICAL: Check if exercise is from the wrong muscle group FIRST
      // This catches cases where AI suggests wrong group exercises
      
      // Check if exercise matches any back exercise patterns (when target is NOT back)
      const isBackExercise = validatedMuscleGroup !== 'Back' && (
        exerciseNameLower.includes('row') || 
        exerciseNameLower.includes('pull') || 
        exerciseNameLower.includes('deadlift') ||
        exerciseNameLower.includes('lat pulldown') ||
        exerciseNameLower.includes('seated row') ||
        exerciseNameLower.includes('barbell row') ||
        exerciseNameLower.includes('t-bar row') ||
        exerciseNameLower.includes('face pulls') ||
        exerciseNameLower.includes('reverse flyes') ||
        exerciseNameLower.includes('hyperextensions') ||
        exerciseNameLower.includes('good mornings') ||
        exerciseNameLower.includes('cable row') ||
        backExercises.some(ex => {
          const exLower = ex.toLowerCase();
          return exerciseNameCleanLower.includes(exLower) || exLower.includes(exerciseNameCleanLower);
        })
      );
      
      // Check if exercise matches any chest exercise patterns (when target is NOT chest)
      const isChestExercise = validatedMuscleGroup !== 'Chest' && (
        exerciseNameLower.includes('chest') ||
        exerciseNameLower.includes('bench') ||
        exerciseNameLower.includes('fly') ||
        exerciseNameLower.includes('dips') ||
        exerciseNameLower.includes('push-up') ||
        chestExercises.some(ex => {
          const exLower = ex.toLowerCase();
          return exerciseNameCleanLower.includes(exLower) || exLower.includes(exerciseNameCleanLower);
        })
      );
      
      // Check if exercise matches any leg exercise patterns (when target is NOT legs)
      const isLegExercise = validatedMuscleGroup !== 'Legs' && (
        exerciseNameLower.includes('squat') ||
        exerciseNameLower.includes('leg press') ||
        exerciseNameLower.includes('leg curl') ||
        exerciseNameLower.includes('leg extension') ||
        exerciseNameLower.includes('lunge') ||
        exerciseNameLower.includes('calf') ||
        (exerciseNameLower.includes('leg') && !exerciseNameLower.includes('leg raise')) ||
        legExercises.some(ex => {
          const exLower = ex.toLowerCase();
          return exerciseNameCleanLower.includes(exLower) || exLower.includes(exerciseNameCleanLower);
        })
      );
      
      // If it's not in the valid list AND matches wrong muscle group, it's definitely wrong
      let isWrongExercise = !isKnownExercise || isBackExercise || isChestExercise || isLegExercise;
      
      // Additional validation for specific groups
      if (validatedMuscleGroup === 'Chest') {
        // If target is Chest but exercise matches Back or Legs, it's wrong
        if (isBackExercise || isLegExercise) {
          isWrongExercise = true;
        }
      } else if (validatedMuscleGroup === 'Legs') {
        // If target is Legs but exercise matches Chest or Back, it's wrong
        if (isChestExercise || isBackExercise) {
          isWrongExercise = true;
        }
      } else if (validatedMuscleGroup === 'Back') {
        // If target is Back but exercise matches Chest or Legs, it's wrong
        if (isChestExercise || isLegExercise) {
          isWrongExercise = true;
        }
      }
      
      // If it's not a known exercise for this muscle group, check if it matches any other group
      if (!isKnownExercise && !isWrongExercise) {
        const matchesOtherGroup = 
          (validatedMuscleGroup !== 'Chest' && chestExercises.some(ex => exerciseNameCleanLower.includes(ex) || ex.includes(exerciseNameCleanLower))) ||
          (validatedMuscleGroup !== 'Legs' && legExercises.some(ex => exerciseNameCleanLower.includes(ex) || ex.includes(exerciseNameCleanLower))) ||
          (validatedMuscleGroup !== 'Back' && backExercises.some(ex => exerciseNameCleanLower.includes(ex) || ex.includes(exerciseNameCleanLower)));
        
        if (matchesOtherGroup) {
          isWrongExercise = true;
          console.warn(`⚠️ Exercise "${exerciseName}" appears to be from a different muscle group`);
        }
      }
      
      // Also check the rationale for wrong mentions - be very strict
      const rationaleLower = (parsed.rationale || '').toLowerCase();
      const wrongMuscleGroups = validatedMuscleGroup === 'Chest' ? ['leg', 'squat', 'back', 'row', 'deadlift', 'calf', 'shoulder', 'arm'] :
                                validatedMuscleGroup === 'Legs' ? ['chest', 'bench', 'fly', 'back', 'row', 'pull', 'shoulder', 'arm'] :
                                validatedMuscleGroup === 'Back' ? ['chest', 'fly', 'squat', 'leg press', 'calf', 'bench', 'shoulder', 'arm'] :
                                validatedMuscleGroup === 'Shoulders' ? ['chest', 'leg', 'squat', 'back', 'row'] :
                                validatedMuscleGroup === 'Arms' ? ['chest', 'leg', 'squat', 'back', 'row'] :
                                ['chest', 'leg', 'squat', 'back', 'row'];
      
      const hasWrongRationale = rationaleLower.includes('balance') || 
        rationaleLower.includes('overall growth') || 
        rationaleLower.includes('different muscle group') ||
        rationaleLower.includes('switch to') ||
        rationaleLower.includes('work different') ||
        rationaleLower.includes('target different') ||
        wrongMuscleGroups.some(group => rationaleLower.includes(group));
      
      if (isWrongExercise) {
        console.error(`❌ AI suggested "${parsed.exercise}" for ${validatedMuscleGroup} - NOT in valid list!`);
        console.error(`   Valid exercises were: ${(validExerciseExamples || []).join(', ')}`);
        console.error(`   Rejecting this suggestion and using fallback.`);
        throw new Error(`AI suggested wrong exercise: ${parsed.exercise} for ${validatedMuscleGroup}`);
      }
      
      // Double-check: if exercise name doesn't match any valid exercise, reject it
      if (!isKnownExercise && validExerciseExamples && validExerciseExamples.length > 0) {
        console.error(`❌ Exercise "${parsed.exercise}" not found in valid list for ${validatedMuscleGroup}`);
        console.error(`   Valid exercises: ${validExerciseExamples.join(', ')}`);
        throw new Error(`Exercise not in valid list: ${parsed.exercise}`);
      }
      
      if (hasWrongRationale) {
        console.error(`❌ AI rationale mentions wrong concepts: "${parsed.rationale}"`);
        console.error(`   This suggests the AI is thinking about wrong muscle groups. Rejecting.`);
        throw new Error(`AI rationale is wrong: ${parsed.rationale}`);
      }
      
      // Use a safe rationale if the AI's rationale mentions wrong concepts
      // Also filter out any mentions of wrong muscle groups
      let safeRationale = parsed.rationale || '';
      
      // Remove mentions of wrong muscle groups from rationale
      if (safeRationale) {
        wrongMuscleGroups.forEach(wrongGroup => {
          const regex = new RegExp(`\\b${wrongGroup}[s]?\\b`, 'gi');
          safeRationale = safeRationale.replace(regex, validatedMuscleGroup.toLowerCase());
        });
        // Remove phrases about balancing or switching
        safeRationale = safeRationale
          .replace(/balance.*?workout/gi, '')
          .replace(/overall.*?growth/gi, '')
          .replace(/different.*?muscle.*?group/gi, '')
          .replace(/switch.*?to/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      // If rationale is still wrong or empty, use a safe one
      if (hasWrongRationale || !safeRationale || safeRationale.length < 10) {
        if (lastExerciseName) {
          safeRationale = `This ${validatedMuscleGroup.toLowerCase()} exercise complements ${lastExerciseName} by targeting ${validatedMuscleGroup.toLowerCase()} from a different angle, continuing your focused ${validatedMuscleGroup.toLowerCase()} workout.`;
        } else {
          safeRationale = `This ${validatedMuscleGroup.toLowerCase()} exercise targets ${validatedMuscleGroup.toLowerCase()} effectively, helping you build ${validatedMuscleGroup.toLowerCase()} muscle.`;
        }
      }
      
      return {
        exercise: parsed.exercise || 'Face Pulls',
        muscleGroup: validatedMuscleGroup, // ALWAYS use required, never trust AI
        sets: typeof parsed.sets === 'number' ? parsed.sets : undefined,
        reps: typeof parsed.reps === 'string' ? parsed.reps : undefined,
        rationale: safeRationale,
        cues: Array.isArray(parsed.cues) ? parsed.cues : undefined,
      };
    } catch (error) {
      console.error('Failed to parse exercise suggestion JSON:', error);
    }
  }

  // Fallback uses required muscle group with appropriate exercise
  // Use an exercise from the valid examples if provided, otherwise use defaults
  const fallbackExercises: Record<string, string[]> = {
    'Chest': ['Incline Press', 'Cable Flyes', 'Dumbbell Press', 'Bench Press', 'Push-ups', 'Dips'],
    'Legs': ['Leg Curl', 'Leg Extension', 'Romanian Deadlift', 'Calf Raise', 'Leg Press', 'Squat'],
    'Back': ['Lat Pulldown', 'Barbell Row', 'T-Bar Row', 'Pull-ups', 'Face Pulls', 'Cable Row'],
    'Shoulders': ['Lateral Raise', 'Overhead Press', 'Rear Delt Fly', 'Front Raise', 'Shrugs'],
    'Arms': ['Hammer Curl', 'Tricep Extension', 'Bicep Curl', 'Tricep Pushdown', 'Cable Curl'],
    'Core': ['Plank', 'Russian Twist', 'Leg Raises', 'Crunches', 'Dead Bug'],
  };
  
  const validOptions = validExerciseExamples && validExerciseExamples.length > 0 
    ? validExerciseExamples 
    : (fallbackExercises[requiredMuscleGroup] || ['Face Pulls']);
  
  const fallbackExercise = validOptions[0] || 'Face Pulls';
  
  console.warn(`⚠️ Using fallback exercise "${fallbackExercise}" for ${requiredMuscleGroup}`);
  console.warn(`   Valid options were: ${validOptions.join(', ')}`);
  
  return {
    exercise: fallbackExercise,
    muscleGroup: requiredMuscleGroup,
    sets: 3,
    reps: '12-15',
    rationale: `This ${requiredMuscleGroup.toLowerCase()} exercise targets ${requiredMuscleGroup.toLowerCase()} effectively.`,
    cues: ['Move with control', 'Focus on quality reps'],
  };
}

/**
 * Build team workout prompt
 */
function buildTeamWorkoutPrompt(players: any[], schedule: any): string {
  return `Generate personalized workout plans for a team of ${players.length} players.

Players: ${JSON.stringify(players.map(p => ({ name: p.name, goal: p.goal, experience: p.experience })))}
Schedule: ${JSON.stringify(schedule)}

Generate individual workout plans for each player, accounting for their goals, experience, and the team schedule.`;
}

/**
 * Build player summary prompt
 */
function buildPlayerSummaryPrompt(playerData: any, workouts: any[], timeRange: string): string {
  return `Generate a progress summary for ${playerData?.firstName || 'Player'}.

Recent Workouts: ${workouts.length}
Time Range: ${timeRange}

Analyze their progress, highlight achievements, identify areas for improvement, and provide actionable recommendations.`;
}

