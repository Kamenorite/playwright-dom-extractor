import axios from 'axios';

export interface AIServiceOptions {
  apiKey?: string;
  endpoint?: string;
}

export class AIService {
  private options: AIServiceOptions;

  constructor(options: AIServiceOptions = {}) {
    this.options = {
      endpoint: process.env.AI_API_ENDPOINT || 'https://api.example.com/generate',
      apiKey: process.env.AI_API_KEY,
      ...options
    };
  }

  async generateSemanticKey(element: any): Promise<string> {
    try {
      // Create a description of the element for the AI to understand
      const elementDescription = this.createElementDescription(element);
      
      // Make API call to AI service
      const response = await axios.post(
        this.options.endpoint!,
        {
          prompt: `Generate a semantic key for this HTML element that captures its purpose and functionality: ${elementDescription}`,
          max_tokens: 50
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.options.apiKey}`
          }
        }
      );

      // Process and clean the response
      const semanticKey = this.processAIResponse(response.data);
      return semanticKey;
    } catch (error) {
      console.error('Error generating semantic key:', error);
      
      // Fallback to a basic key if AI fails
      return element.id || 
        `${element.tagName}_${element.innerText?.substring(0, 20).replace(/\s+/g, '_') || 'element'}`;
    }
  }

  private createElementDescription(element: any): string {
    let description = `<${element.tagName}`;
    
    if (element.id) {
      description += ` id="${element.id}"`;
    }
    
    if (element.classes && element.classes.length > 0) {
      description += ` class="${element.classes.join(' ')}"`;
    }
    
    // Add important attributes
    const importantAttrs = ['role', 'aria-label', 'name', 'type', 'placeholder', 'href', 'title'];
    importantAttrs.forEach(attr => {
      if (element.attributes[attr]) {
        description += ` ${attr}="${element.attributes[attr]}"`;
      }
    });
    
    description += '>';
    
    if (element.innerText) {
      description += element.innerText.substring(0, 100);
      if (element.innerText.length > 100) description += '...';
    }
    
    description += `</${element.tagName}>`;
    
    return description;
  }

  private processAIResponse(response: any): string {
    // Extract the key from the AI response
    // This would depend on the specific AI service you're using
    let key = response.text || response.choices?.[0]?.text || '';
    
    // Clean up the key - remove quotes, spaces, etc.
    key = key.trim().replace(/['"]/g, '');
    key = key.replace(/\s+/g, '_').toLowerCase();
    
    // Ensure it's a valid identifier
    key = key.replace(/[^a-z0-9_]/gi, '');
    
    return key || 'ai_generated_key';
  }
} 