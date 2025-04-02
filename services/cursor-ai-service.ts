import { AIService, AIServiceOptions } from './ai-service';

export interface CursorAIServiceOptions extends AIServiceOptions {
  mcpEnabled?: boolean;
  useAI?: boolean;
}

/**
 * Service that leverages Cursor's AI capabilities for better semantic keys
 * This uses composition rather than inheritance with AIService
 */
export class CursorAIService {
  private options: CursorAIServiceOptions;
  private aiService: AIService;

  constructor(options: CursorAIServiceOptions = {}) {
    this.options = {
      mcpEnabled: true,
      useAI: true,
      ...options
    };
    this.aiService = new AIService(options);
  }

  /**
   * Use Cursor's MCP integration to analyze a page and generate semantic keys
   * This is the primary method for semantic key generation when using Cursor
   */
  async generateSemanticKeysForPage(url: string): Promise<any[]> {
    if (this.options.mcpEnabled) {
      console.log('Using Cursor MCP to analyze page and generate semantic keys...');
      try {
        // First use the base AI service to get initial elements with basic semantic keys
        const elements = await this.aiService.generateSemanticKeysForPage(url);
        
        // Then enhance the semantic keys with Cursor's AI capabilities
        return this.enhanceSemanticKeys(elements);
      } catch (error) {
        console.error('Error using Cursor MCP:', error);
        return this.aiService.generateSemanticKeysForPage(url);
      }
    } else {
      return this.aiService.generateSemanticKeysForPage(url);
    }
  }

  /**
   * For compatibility with AIService
   */
  async extractDOMAndGenerateSemanticKeys(url: string): Promise<any[]> {
    return this.generateSemanticKeysForPage(url);
  }

  /**
   * Generate a semantic key for a single element
   */
  async generateSemanticKeyForElement(element: any): Promise<string> {
    // First get a basic semantic key from the aiService
    const basicKey = await this.aiService.generateSemanticKeyForElement(element);
    
    // Then enhance it with Cursor's AI capabilities
    return this.enhanceSemanticKey({
      ...element,
      semanticKey: basicKey
    });
  }

  /**
   * Enhance semantic keys with Cursor's AI to make them more meaningful
   * @param elements Elements with basic semantic keys
   * @returns Elements with enhanced semantic keys
   */
  private async enhanceSemanticKeys(elements: any[]): Promise<any[]> {
    // In a real implementation, this would use Cursor's AI to enhance the keys
    // For now, apply additional heuristics to improve the keys
    return elements.map(element => {
      const enhancedKey = this.enhanceSemanticKey(element);
      return {
        ...element,
        semanticKey: enhancedKey
      };
    });
  }

  /**
   * Enhance a single semantic key with more context and meaning
   */
  private enhanceSemanticKey(element: any): string {
    // Use the new context-aware semantic key generation
    return this.generateContextAwareSemanticKey(element);
  }
  
  /**
   * Generate a context-aware semantic key that follows the pattern [context]_[action/type]_[description]
   * Uses a more sophisticated approach to create meaningful, consistent semantic keys
   */
  private generateContextAwareSemanticKey(element: any): string {
    const originalKey = element.semanticKey || '';
    
    // Special handling for data-testid - prioritize it first if available
    if (element.attributes && element.attributes['data-testid']) {
      // Use data-testid directly, transforming it to snake_case if needed
      const testId = element.attributes['data-testid']
        .replace(/([A-Z])/g, '_$1') // Convert camelCase to snake_case
        .replace(/[-\s]+/g, '_')    // Convert dashes and spaces to underscores
        .replace(/^_/, '')          // Remove leading underscore if present
        .toLowerCase();              // Ensure lowercase
      
      // If data-testid already follows our pattern, return it directly
      if (/^[a-z]+_[a-z]+_[a-z0-9_]+$/.test(testId)) {
        return testId;
      }
      
      // Otherwise, extract context and action if possible
      const parts = testId.split('_');
      if (parts.length >= 2) {
        // If data-testid has at least two parts, use it as is - we want to keep the original
        // data-testid naming convention as much as possible
        return testId;
      }
      
      // For simple data-testid values (just one word), get context from other element properties
      const context = this.determineContext(element) || 'ui';
      const action = this.determineAction(element);
      
      // Construct a key that incorporates the testId but follows our pattern
      return `${context}_${action}_${testId}`;
    }
    
    // If not data-testid, proceed with regular semantic key generation
    // Step 1: Determine context prefix
    const context = this.determineContext(element);
    
    // Step 2: Determine action/type component
    const action = this.determineAction(element);
    
    // Step 3: Determine description component
    const description = this.determineDescription(element);
    
    // Step 4: Combine components to create semantic key
    let semanticKey = '';
    
    // Check if original key already follows our pattern
    const keyParts = originalKey.split('_');
    if (keyParts.length >= 3 && keyParts[0] === context && keyParts[1] === action) {
      // Original key already follows our pattern, keep it
      return originalKey;
    }
    
    // Generate new key following our pattern
    semanticKey = `${context}_${action}_${description}`;
    
    // Clean up the key - remove duplicate words
    const uniqueWords = new Set<string>();
    const finalKeyParts = semanticKey.split('_').filter(part => {
      if (!part || part.length === 0) return false;
      if (uniqueWords.has(part)) return false;
      uniqueWords.add(part);
      return true;
    });
    
    // Rebuild key with unique words
    return finalKeyParts.join('_');
  }
  
  /**
   * Determine the context component of a semantic key
   */
  private determineContext(element: any): string {
    let context = '';
    
    // From URL/page context
    if (element.url) {
      try {
        const url = new URL(element.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        if (pathParts.length > 0) {
          const lastPath = pathParts[pathParts.length - 1]
            .replace(/[^\w]/g, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
            
          // Handle common pages
          context = lastPath === 'index' || lastPath === '' ? 'homepage' : lastPath;
        } else {
          context = 'homepage';
        }
      } catch (error) {
        // URL parsing failed, try other approaches
      }
    }
    
    // From feature name if available and specified
    if (element.featureName && element.featureName.trim() !== '') {
      context = element.featureName.toLowerCase();
    }
    
    // From parent container if available (could be derived from xpath)
    if (!context && element.xpath) {
      const parts = element.xpath.split('/');
      if (parts.length > 3) {
        // Check for common container patterns in xpath
        const containerIndicators = ['nav', 'header', 'footer', 'sidebar', 'main', 'menu', 'modal', 'dialog', 'form'];
        for (let i = parts.length - 3; i >= 0; i--) {
          const part = parts[i].toLowerCase();
          for (const indicator of containerIndicators) {
            if (part.includes(indicator)) {
              context = indicator;
              break;
            }
          }
          if (context) break;
        }
      }
    }
    
    // Default to 'ui' if no context found
    return context || 'ui';
  }
  
  /**
   * Determine the action/type component of a semantic key
   */
  private determineAction(element: any): string {
    // For interactive elements, use action verbs
    if (element.tagName === 'button' || 
        (element.tagName === 'input' && (element.attributes.type === 'button' || element.attributes.type === 'submit'))) {
      
      if (element.innerText) {
        const text = element.innerText.toLowerCase();
        
        // Match common action verbs
        if (/submit|save|confirm|apply|ok|yes/.test(text)) {
          return 'submit';
        } else if (/cancel|close|dismiss|back|return/.test(text)) {
          return 'cancel';
        } else if (/delete|remove|clear/.test(text)) {
          return 'delete';
        } else if (/add|create|new|plus|\+/.test(text)) {
          return 'create';
        } else if (/edit|update|modify|change/.test(text)) {
          return 'edit';
        } else if (/search|find|filter|query/.test(text)) {
          return 'search';
        } else if (/download|export/.test(text)) {
          return 'download';
        } else if (/upload|import/.test(text)) {
          return 'upload';
        } else if (/view|show|display|open/.test(text)) {
          return 'view';
        } else if (/toggle|switch|enable|disable/.test(text)) {
          return 'toggle';
        } else {
          return 'button';
        }
      } else {
        return 'button';
      }
    } 
    // For links
    else if (element.tagName === 'a') {
      if (element.xpath.includes('nav') || element.xpath.includes('menu')) {
        return 'nav_link';
      }
      return 'link';
    }
    // For inputs
    else if (element.tagName === 'input') {
      const inputType = element.attributes.type || 'text';
      return `${inputType}_input`;
    }
    // For headings
    else if (/^h[1-6]$/.test(element.tagName)) {
      return 'heading';
    }
    // For selection elements
    else if (element.tagName === 'select') {
      return 'dropdown';
    }
    // Default for other elements
    return element.tagName;
  }
  
  /**
   * Determine the description component of a semantic key
   */
  private determineDescription(element: any): string {
    // Try to extract from text content
    if (element.innerText) {
      // Remove special characters and limit length
      const description = element.innerText
        .substring(0, 30)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
        
      // Limit to 2-3 words
      const words = description.split('_');
      if (words.length > 3) {
        return words.slice(0, 3).join('_');
      }
      return description;
    }
    
    // If no text content, try placeholder, title, or aria-label
    if (element.attributes) {
      const description = (element.attributes.placeholder || 
                    element.attributes.title || 
                    element.attributes['aria-label'] ||
                    element.attributes.name ||
                    element.attributes.id || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .trim()
                    .replace(/\s+/g, '_');
      
      if (description) {
        return description;
      }
    }
    
    // If still no description, use a hash of attributes
    const stringify = JSON.stringify(element.attributes || {});
    const hash = this.simpleHash(stringify).substring(0, 6);
    return `element_${hash}`;
  }

  /**
   * Generate a simple hash for uniqueness in semantic keys
   * @param str String to hash
   * @returns A simple hash string
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }
} 